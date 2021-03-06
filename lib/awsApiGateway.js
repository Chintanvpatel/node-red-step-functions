var when = require('when')
var AWS = require('aws-sdk')
var _ = require('lodash')
var apigateway = new AWS.APIGateway({ region: 'us-east-1' })
var route53 = new AWS.Route53({ region: 'us-east-1' })
var s3 = new AWS.S3({ region: 'us-east-1' })
// Exclude default properties of node
const ignoreProp = [
  'wires',
  'x',
  'y',
  'type',
  'id',
  'z'
]
var awsApiGateway = {
  prepare: function (rawJson, endpointData, stepDefinitions) {
    return when.promise(function (resolve, reject) {
      var configInput = {}
      const initNodes = rawJson.filter(function (node) {
        return node.type.endsWith('in') && node.wires[0].length > 0
      })
      var gNodes = _.groupBy(initNodes, function (inode) {
        return inode.url
      })
      Object.keys(gNodes).forEach(function (endpoint) {
        _.map(gNodes[endpoint], function (ep) {
          var epData = _.find(endpointData, function (epObj) {
            return epObj.node.id === ep.id
          })

          ep.serviceArn = epData.stateMachineArn
          ep.serviceType = 'stepfunction'
          return ep
        })
      })

      if (stepDefinitions.length > 0) {
        stepDefinitions.forEach(function (def) {
          var filteredNodes = rawJson.filter(function (node) {
            return node.id.replace('.', '_') === def.StartAt
          })
          Object.keys(filteredNodes[0]).forEach(function (i) {
            if (!ignoreProp.includes(i)) {
              if (!configInput[filteredNodes[0]['id'].replace('.', '_')]) {
                configInput[filteredNodes[0]['id'].replace('.', '_')] = {}
              }
              configInput[filteredNodes[0]['id'].replace('.', '_')][i] = filteredNodes[0][i]
            }
          })
        })
      }

      resolve({ endpoints: gNodes, config: configInput })
    })
  },
  create: function (gatewayJson, restApiId, brandId, appId, poolId, appname, s3BucketName) {
    return when.promise(function (resolve, reject) {
      console.log('Saving API Definition..')
      saveApiDefinition(gatewayJson, s3BucketName, brandId, appId, poolId, appname).then(data => {
        console.log('Creating domain...')
        createDomain(brandId).then(
          (domainData) => {
            var edgeDomain = domainData.res.distributionDomainName
            console.log('Creating base path..')
            createBasePathMapping(brandId, restApiId, domainData.isExist).then(
              (brandId, data) => {
                console.log('Creating recordset..')
                createRecordSet(brandId, edgeDomain).then(
                  data => {
                    resolve(data)
                  },
                  err => {
                    console.log(err)
                    reject(err)
                  }
                )
              },
              err => {
                console.log(err)
                reject(err)
              }
            )
          },
          err => {
            console.log(err)
            reject(err)
          }
        )
      }, err => {
        console.log(err)
        reject(err)
      })
    })
  }
}

var saveApiDefinition = function (definition, s3BucketName, brandId, appId, poolId, appname) {
  return when.promise(function (resolve, reject) {
    var params = {}
    params.Bucket = s3BucketName
    params.Key = appname + '/' + brandId + '/' + appId + '/' + 'api_definition.json'
    params.Body = JSON.stringify(definition)
    console.log(params)
    s3.upload(params, function (err, res) {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}

var createDomain = function (brandId) {
  return when.promise(function (resolve, reject) {
    var params = {
      domainName: brandId + '-api.wsuite.com',
      certificateArn:
        'arn:aws:acm:us-east-1:133013689155:certificate/74991899-d4db-40ea-a32d-fc8901abf083',
      endpointConfiguration: {
        types: ['EDGE']
      }
    }
    apigateway.createDomainName(params, function (err, data) {
      if (err) {
        if (err.code === 'BadRequestException') {
          console.log('Domain name is already exist')
          var domainParams = {
            domainName: brandId + '-api.wsuite.com'
          }
          apigateway.getDomainName(domainParams, function (err, data) {
            if (err) {
              reject(err)
            } else {
              resolve({ res: data, isExist: true })
            }
          })
        } else {
          reject(err)
        }
      } else {
        resolve({ res: data, isExist: false })
      }
    })
  })
}

var createBasePathMapping = function (brandId, restApiId, isExist) {
  return when.promise(function (resolve, reject) {
    if (!isExist) {
      var params = {
        domainName: brandId + '-api.wsuite.com',
        restApiId: restApiId,
        basePath: '',
        stage: 'production'
      }
      apigateway.createBasePathMapping(params, function (err, data) {
        if (err) {
          reject(err)
        } else {
          resolve(brandId, data)
        }
      })
    } else {
      console.log('No need to create base path')
      resolve(brandId, null)
    }
  })
}

var createRecordSet = function (brandId, edgeDomain) {
  return when.promise(function (resolve, reject) {
    var params = {
      ChangeBatch: {
        Changes: [
          {
            Action: 'CREATE',
            ResourceRecordSet: {
              Name: brandId + '-api.wsuite.com',
              ResourceRecords: [
                {
                  Value: edgeDomain
                }
              ],
              TTL: 60,
              Type: 'CNAME'
            }
          }
        ]
      },
      HostedZoneId: 'ZLUNFBW7I9KIX'
    }
    route53.changeResourceRecordSets(params, function (err, data) {
      if (err) {
        if (err.message.indexOf('already exists')) {
          console.log('No need to create record set')
          resolve(null)
        } else {
          reject(err)
        }
      } else {
        resolve(data)
      }
    })
  })
}

module.exports = awsApiGateway
