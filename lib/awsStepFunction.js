var when = require('when');
var AWS = require('aws-sdk');
const uuidv1 = require('uuid/v1');

const nodeTypeMapping = {
    'template': 'arn:aws:lambda:us-east-1:133013689155:function:template-node',
    'http response': 'arn:aws:lambda:us-east-1:133013689155:function:http-response-node'
}

var states = {};

var awsStepFunction = {
    convert: function (flowJson) {
        return when.promise(function (resolve, reject) {
            // Build State machine by calculating input points
            initNodes = flowJson.filter(function (node) {
                return node.type.endsWith('in');
            });
            var promises = [];

            initNodes.forEach((node) => {
                promises.push(promiseConvert(node, flowJson));
            });

            when.all(promises).then(data => {
                console.log(JSON.stringify(data))
                resolve(data)
            })
        });
    },
    save: function (definition) {
        return when.promise(function (resolve, reject) {
            var stepfunctions = new AWS.StepFunctions();
            var params = {
                definition: JSON.stringify(definition),
                name: uuidv1(),
                roleArn: 'arn:aws:iam::133013689155:role/service-role/StepFunctionExecutionRole'
            };
            stepfunctions.createStateMachine(params, function (err, data) {
                if (err) {
                    reject(err)
                } else {
                    resolve(data)
                }
            });
        });
    }
}

var promiseConvert = function (node, allNodes) {
    return when.promise(function (resolve, reject) {
        states = {}
        states['States'] = {}
        addInitialNode(node.wires[0][0], states).then(states => {
            processNode(node.wires[0][0], allNodes, states).then(states => {
                addFinalNode(states).then(states => {
                    resolve(states)
                });
            });
        })
    });
}

var processNode = function (wiredNode, allNodes, states, previousNode) {
    return when.promise(function (resolve, reject) {
        nodeDetail = allNodes.filter(function (node) {
            return node.id === wiredNode;
        });
        states['States'][nodeDetail[0].id.replace('.', '_')] = {}
        states['States'][nodeDetail[0].id.replace('.', '_')]['Type'] = 'Task'
        states['States'][nodeDetail[0].id.replace('.', '_')]['TimeoutSeconds'] = 300
        states['States'][nodeDetail[0].id.replace('.', '_')]['Resource'] = nodeTypeMapping[nodeDetail[0].type]
        states['States'][nodeDetail[0].id.replace('.', '_')]['ResultPath'] = '$.result'
        states['States'][nodeDetail[0].id.replace('.', '_')]['OutputPath'] = '$.result.result'
        if (previousNode) {
            states['States'][previousNode]['Next'] = nodeDetail[0].id.replace('.', '_')
        }
        if (nodeDetail[0].wires.length === 0) {
            states['States'][nodeDetail[0].id.replace('.', '_')]['Next'] = 'Succeed'
            resolve(states)
        } else {
            resolve(when.promise(function (resolveObj, reject) {
                processNode(nodeDetail[0].wires[0][0], allNodes, states, nodeDetail[0].id.replace('.', '_')).then(function (states) {
                    resolveObj(states)
                });
            }));
        }

    });
}

var addInitialNode = function(nodeId, states) {
    return when.promise(function(resolve,reject){
        states['StartAt'] = nodeId.replace('.', '_')
        resolve(states)
    });
}

var addFinalNode = function(states) {
    return when.promise(function(resolve,reject){
        states['States']['Succeed'] = {}
        states['States']['Succeed']['Type'] = 'Succeed'
        resolve(states)
    });
}

module.exports = awsStepFunction;