var stepFunction = require('./stepFunction')

var settings = {
  awsS3Bucket: 'wsuite-alb',
  awsRegion: 'us-east-1',
  brand_id: 52137,
  awsS3Appname: 'test',
  pool_id: 'TfRD4'
}



// var flowJson = [{"id":"33c36288.1d67de","type":"tab","label":"Flow 1","disabled":false,"info":""},{"id":"65773b1b.81c4c4","type":"tab","label":"W Content","disabled":false,"info":""},{"id":"e448d63.7d77528","type":"CreateCognitoUser","z":"33c36288.1d67de","name":"","user_attrs":"test","x":310,"y":100,"wires":[["7a50d687.c01dc8"]]},{"id":"2799a30f.98f55c","type":"http in","z":"33c36288.1d67de","name":"","url":"/test","method":"get","security":"public","upload":false,"swaggerDoc":"","x":110,"y":120,"wires":[["e448d63.7d77528"]]},{"id":"7a50d687.c01dc8","type":"http response","z":"33c36288.1d67de","name":"","statusCode":"","headers":{},"x":540,"y":160,"wires":[]}]

var flowJson = [{"id":"33c36288.1d67de","type":"tab","label":"Flow 1","disabled":false,"info":""},{"id":"65773b1b.81c4c4","type":"tab","label":"W Content","disabled":false,"info":""},{"id":"83de3f67.29944","type":"get-query-data","z":"33c36288.1d67de","name":"get-query-data","dbhost":"","dbname":"","dbusername":"","dbpassword":"","limit":"","x":340,"y":240,"wires":[["6b669220.69c0cc"]]},{"id":"e7520cb0.a3b02","type":"http in","z":"33c36288.1d67de","name":"","url":"","method":"get","security":"private","upload":false,"x":120,"y":260,"wires":[["83de3f67.29944"]]},{"id":"6b669220.69c0cc","type":"http response","z":"33c36288.1d67de","name":"","statusCode":"","headers":{},"x":570,"y":260,"wires":[]}]



stepFunction.init(settings)
console.log(stepFunction.saveData('flow', flowJson))
