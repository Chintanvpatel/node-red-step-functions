var when = require('when');
var AWS = require('aws-sdk');
const uuidv1 = require('uuid/v1');

var awsStepFunction = {
    convert: function () {
        return when.promise(function (resolve, reject) {
            var stateMachineCode = {
                "StartAt": "TemplateRender",
                "States": {
                    "TemplateRender": {
                        "Type": "Task",
                        "TimeoutSeconds": 60,
                        "Next": "HttpResponse",
                        "Resource": "arn:aws:lambda:us-east-1:133013689155:function:template-node",
                        "ResultPath": "$.result",
                        "OutputPath": "$.result.result"
                    },
                    "HttpResponse": {
                        "Type": "Task",
                        "TimeoutSeconds": 60,
                        "Next": "Succeed",
                        "Resource": "arn:aws:lambda:us-east-1:133013689155:function:http-response-node",
                        "ResultPath": "$.result",
                        "OutputPath": "$.result.result"
                    },
                    "Succeed": {
                        "Type": "Succeed"
                    }
                }
            }
            resolve(stateMachineCode);
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

module.exports = awsStepFunction;