'use strict'
var when = require('when')
var AWS = require('aws-sdk')

var states = {}
var awsStepFunction = {
  convert: function (flowJson,lambdaMapping) {
    return when.promise(function (resolve, reject) {
      // Build State machine by calculating input points
      var initNodes = flowJson.filter(function (node) {
        return node.type.endsWith('in') && node.wires[0].length > 0
      })
      var promises = []
      initNodes.forEach((node) => {
        promises.push(promiseConvert(node, flowJson,lambdaMapping))
      })

      when.all(promises).then((data) => {
        resolve(data)
      })
    })
  },
  save: function (definition) {
    console.log('save---',definition)
    return when.promise(function (resolve, reject) {
      var defOrig = Object.assign({}, definition)
      delete definition.node
      var stepfunctions = new AWS.StepFunctions()
      var params = {
        stateMachineArn: 'arn:aws:states:us-east-1:133013689155:stateMachine:' + defOrig.node.id.replace('.', '-') + '-sfunction'
      }
      console.log('params--',params);
      stepfunctions.describeStateMachine(params, function (err, data) {
        if (err) {
          console.log('Error4 ---',err)
          if (err.code === 'StateMachineDoesNotExist') {
            var params = {
              definition: JSON.stringify(definition),
              name: defOrig.node.id.replace('.', '-') + '-sfunction',
              roleArn: 'arn:aws:iam::133013689155:role/service-role/StepFunctionExecutionRole'
            }
            stepfunctions.createStateMachine(params, function (err, data) {
              if (err) { console.log('Error3 ---',err)
                reject(err)
              } else {
                data.node = defOrig.node
                resolve(data)
              }
            })
          } else { console.log('Error2 ---',err)
            console.log(err, err.stack)
            reject(err.code)
          }
        } else {
          var sparams = {
            definition: JSON.stringify(definition),
            stateMachineArn: 'arn:aws:states:us-east-1:133013689155:stateMachine:' + defOrig.node.id.replace('.', '-') + '-sfunction',
            roleArn: 'arn:aws:iam::133013689155:role/service-role/StepFunctionExecutionRole'
          }
          console.log('sparams---',sparams)
          stepfunctions.updateStateMachine(sparams, function (err, data) {
            if (err) { console.log('Error1 ---',err)
              reject(err)
            } else {
              data.node = defOrig.node
              data.stateMachineArn = sparams.stateMachineArn
              resolve(data)
            }
          })
        }
      })
    })
  }
}

var promiseConvert = function (node, allNodes,lambdaMapping) {
  return when.promise(function (resolve, reject) {
    states = {}
    states['States'] = {}
    addInitialNode(node.wires[0][0], states).then(states => {
      processNode(node.wires[0][0], allNodes, states,'',lambdaMapping).then(states => {
        addFinalNode(states).then(states => {
          states.node = node
          resolve(states)
        })
      })
    })
  })
}

var processNode = function (wiredNode, allNodes, states, previousNode,lambdaMapping) {
  return when.promise(function (resolve, reject) {
    var nodeDetail = allNodes.filter(function (node) {
      return node.id === wiredNode
    })
    processTaskNodes(nodeDetail, previousNode, states,lambdaMapping).then((states) => {
      if (nodeDetail[0].wires.length === 0) {
        states['States'][nodeDetail[0].id.replace('.', '_')]['Next'] = 'Succeed'
        resolve(states)
      } else if (nodeDetail[0].wires.length > 1) {
        resolve(when.promise(function (resolveObj, reject) {
          const wPromises = []
          nodeDetail[0].wires.forEach((wNode) => {
            wPromises.push(processNode(wNode[0], allNodes, states, nodeDetail[0].id.replace('.', '_'),lambdaMapping))
          })

          when.all(wPromises).then((states) => {
            resolveObj(states)
          })
        }))
      } else {
        resolve(when.promise(function (resolveObj, reject) {
          processNode(nodeDetail[0].wires[0][0], allNodes, states, nodeDetail[0].id.replace('.', '_'),lambdaMapping).then(function (states) {
            resolveObj(states)
          })
        }))
      }
    })
  })
}

var addInitialNode = function (nodeId, states) {
  return when.promise(function (resolve, reject) {
    states['StartAt'] = nodeId ? nodeId.replace('.', '_') : nodeId
    resolve(states)
  })
}

var processTaskNodes = function (nodeDetail, previousNode, states,lambdaMapping) {
  console.log('lambdaMapping----------',lambdaMapping[nodeDetail[0].type])
  return when.promise(function (resolve, reject) {
    if(lambdaMapping[nodeDetail[0].type]!==undefined) {
    if (nodeDetail[0] && nodeDetail[0].type !== 'switch') {
      states['States'][nodeDetail[0].id.replace('.', '_')] = {}
      states['States'][nodeDetail[0].id.replace('.', '_')]['Type'] = 'Task'
      states['States'][nodeDetail[0].id.replace('.', '_')]['TimeoutSeconds'] = 300
      states['States'][nodeDetail[0].id.replace('.', '_')]['Resource'] = lambdaMapping[nodeDetail[0].type]
      states['States'][nodeDetail[0].id.replace('.', '_')]['ResultPath'] = '$.output'
      states['States'][nodeDetail[0].id.replace('.', '_')]['OutputPath'] = '$'
      states['States'][nodeDetail[0].id.replace('.', '_')]['Parameters'] = {}
      states['States'][nodeDetail[0].id.replace('.', '_')]['Parameters']['Payload.$'] = '$.payload'
      states['States'][nodeDetail[0].id.replace('.', '_')]['Parameters']['Config.$'] = '$.config'
      states['States'][nodeDetail[0].id.replace('.', '_')]['Parameters']['headers.$'] = '$.headers'
      states['States'][nodeDetail[0].id.replace('.', '_')]['Parameters']['serviceConfig.$'] = '$.serviceConfig'
      states['States'][nodeDetail[0].id.replace('.', '_')]['Parameters']['Execution.$'] = '$$.State'
      if (previousNode) {
        states['States'][nodeDetail[0].id.replace('.', '_')]['Parameters']['PrevOutput.$'] = '$.output'
      }
      if (nodeDetail[0].wires.length !== 0) {
        states['States'][nodeDetail[0].id.replace('.', '_')]['Next'] = nodeDetail[0].wires[0][0].replace('.', '_')
      }

      // if (previousNode) {
      //     states['States'][previousNode]['Next'] = nodeDetail[0].id.replace('.', '_')
      // }
      resolve(states)
    }
    } else if (nodeDetail[0] && nodeDetail[0].type === 'switch') {
      const outputVar = nodeDetail[0].propertyType
      let type
      const choices = []
      let typeString
      nodeDetail[0].rules.forEach((rule, index) => {
        const choice = {}
        if (rule.vt === 'str') {
          type = 'String'
        } else if (rule.vt === 'num') {
          type = 'Numeric'
        }
        if (rule.t === 'eq') {
          typeString = type + 'Equals'
          choice['Variable'] = '$.' + outputVar
          choice[typeString] = rule.v
          choice['Next'] = nodeDetail[0].wires[index][0].replace('.', '_')
          choices.push(choice)
        } else if (rule.t === 'neq') {
          typeString = type + 'Equals'
          choice['Not']['Variable'] = '$.' + outputVar
          choice['Not'][typeString] = rule.v
          choice['Next'] = nodeDetail[0].wires[index][0].replace('.', '_')
          choices.push(choice)
        } else if (rule.t === 'gt') {
          typeString = type + 'GreaterThan'
          choice['Variable'] = '$.' + outputVar
          choice[typeString] = rule.v
          choice['Next'] = nodeDetail[0].wires[index][0].replace('.', '_')
          choices.push(choice)
        } else if (rule.t === 'gte') {
          typeString = type + 'GreaterThanEquals'
          choice['Variable'] = '$.' + outputVar
          choice[typeString] = rule.v
          choice['Next'] = nodeDetail[0].wires[index][0].replace('.', '_')
          choices.push(choice)
        } else if (rule.t === 'lt') {
          typeString = type + 'LessThan'
          choice['Variable'] = '$.' + outputVar
          choice[typeString] = rule.v
          choice['Next'] = nodeDetail[0].wires[index][0].replace('.', '_')
          choices.push(choice)
        } else if (rule.t === 'lte') {
          typeString = type + 'LessThanEquals'
          choice['Variable'] = '$.' + outputVar
          choice[typeString] = rule.v
          choice['Next'] = nodeDetail[0].wires[index][0].replace('.', '_')
          choices.push(choice)
        }
      })
      states['States'][nodeDetail[0].id.replace('.', '_')] = {}
      states['States'][nodeDetail[0].id.replace('.', '_')]['Type'] = 'Choice'
      states['States'][nodeDetail[0].id.replace('.', '_')]['Choices'] = choices
      // if (previousNode) {
      //     states['States'][previousNode]['Next'] = nodeDetail[0].id.replace('.', '_')
      // }
      resolve(states)
    }
  })
}

var addFinalNode = function (states) {
  return when.promise(function (resolve, reject) {
    if (states.length > 1) {
      states = states[0]
    }
    states['States']['Succeed'] = {}
    states['States']['Succeed']['Type'] = 'Succeed'
    resolve(states)
  })
}

module.exports = awsStepFunction
