var when = require("when");
var AWS = require("aws-sdk");
var _ = require("lodash");
var apigateway = new AWS.APIGateway({ region: "us-east-1" });
var route53 = new AWS.Route53({ region: "us-east-1" });
var s3 = new AWS.S3({ region: "us-east-1" });

var awsApiGateway = {
  prepare: function(rawJson, endpointData) {
    return when.promise(function(resolve, reject) {
      initNodes = rawJson.filter(function(node) {
        return node.type.endsWith("in");
      });
      var gNodes = _.groupBy(initNodes, function(inode) {
        return inode.url;
      });
      Object.keys(gNodes).forEach(function(endpoint) {
        var endpointDetails = _.map(gNodes[endpoint], function(ep) {
          var epData = _.find(endpointData, function(epObj) {
            return epObj.node.id == ep.id;
          });
          ep.serviceArn = epData.stateMachineArn;
          ep.serviceType = "stepfunction";
          return ep;
        });
      });
      resolve(gNodes);
    });
  },
  create: function(gatewayJson, restApiId, brandId, s3BucketName) {
    console.log(gatewayJson);
    return when.promise(function(resolve, reject) {
      console.log("Saving API Definition..");
      saveApiDefinition(gatewayJson, s3BucketName, brandId).then(data => {
        console.log("Creating domain...");
        createDomain(brandId).then(
          domainData => {
            var edgeDomain = domainData.distributionDomainName;
            console.log("Creating base path..");
            createBasePathMapping(brandId, restApiId).then(
              (brandId, data) => {
                console.log("Creating recordset..");
                createRecordSet(brandId, edgeDomain).then(
                  data => {
                    resolve(data);
                  },
                  err => {
                    console.log(err);
                    reject(err);
                  }
                );
              },
              err => {
                console.log(err);
                reject(err);
              }
            );
          },
          err => {
            console.log(err);
            reject(err);
          }
        );
      }, err => {
        console.log(err);
        reject(err);
      });
    });
  }
};

// var isResourceExist = function(restApiId, resourcePath) {
//   return when.promise(function(resolve, reject) {
//     var params = {
//       restApiId: restApiId,
//       limit: 100
//     };
//     apigateway.getResources(params, function(err, data) {
//       if (err) {
//         reject(err);
//       } else {
//         var existingResource = data.items.filter(path => {
//           return path.path == resourcePath;
//         });
//         var parentResource = data.items.filter(path => {
//           return path.path == "/";
//         });
//         if (existingResource.length == 0) {
//           resolve({ exist: false, parent: parentResource[0] });
//         } else {
//           resolve({ exist: true, parent: parentResource[0] });
//         }
//       }
//     });
//   });
// };

var saveApiDefinition = function(definition, s3BucketName, brandId) {
  return when.promise(function(resolve, reject) {
    var params = {};
    params.Bucket = s3BucketName;
    params.Key = brandId + "/api_definition.json";
    params.Body = JSON.stringify(definition);
    s3.upload(params, function(err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

var createDomain = function(brandId) {
  return when.promise(function(resolve, reject) {
    var params = {
      domainName: brandId + "-api.wsuite.com",
      certificateArn:
        "arn:aws:acm:us-east-1:133013689155:certificate/74991899-d4db-40ea-a32d-fc8901abf083",
      endpointConfiguration: {
        types: ["EDGE"]
      }
    };
    apigateway.createDomainName(params, function(err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

var createBasePathMapping = function(brandId, restApiId) {
  return when.promise(function(resolve, reject) {
    var params = {
      domainName: brandId + "-api.wsuite.com",
      restApiId: restApiId,
      basePath: "",
      stage: "production"
    };
    apigateway.createBasePathMapping(params, function(err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(brandId, data);
      }
    });
  });
};

var createRecordSet = function(brandId, edgeDomain) {
  return when.promise(function(resolve, reject) {
    var params = {
      ChangeBatch: {
        Changes: [
          {
            Action: "CREATE",
            ResourceRecordSet: {
              Name: brandId + "-api.wsuite.com",
              ResourceRecords: [
                {
                  Value: edgeDomain
                }
              ],
              TTL: 60,
              Type: "CNAME"
            }
          }
        ]
      },
      HostedZoneId: "ZLUNFBW7I9KIX"
    };
    route53.changeResourceRecordSets(params, function(err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

module.exports = awsApiGateway;
