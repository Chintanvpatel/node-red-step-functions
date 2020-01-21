var stepFunction = require('./stepFunction')

var settings = {
  awsS3Bucket: 'wsuite-alb',
  awsRegion: 'us-east-1',
  brand_id: 52137,
  awsS3Appname: 'test',
  pool_id: 'TfRD4'
}

var flowJson = [{"id":"5b2a8c81.0faec4","type":"tab","label":"Flow 1","disabled":false,"info":""},{"id":"65f16fc1.53bc3","type":"http in","z":"5b2a8c81.0faec4","name":"","url":"/welcome","method":"get","upload":false,"swaggerDoc":"","x":130,"y":80,"wires":[["de2e8609.f8a098"]]},{"id":"de2e8609.f8a098","type":"template","z":"5b2a8c81.0faec4","name":"","field":"payload","fieldType":"msg","format":"text","syntax":"plain","template":"This is the payload","output":"str","x":320,"y":60,"wires":[["9ee92628.f80048"]]},{"id":"9ee92628.f80048","type":"http response","z":"5b2a8c81.0faec4","name":"","statusCode":"","headers":{},"x":470,"y":80,"wires":[]}]

stepFunction.init(settings)
console.log(stepFunction.saveData('flow', flowJson))
