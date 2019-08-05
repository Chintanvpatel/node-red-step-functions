var stepFunction = require('./stepFunction')

var settings = {
  awsS3Bucket: 'wsuite-alb',
  awsRegion: 'us-east-1',
  brand_id: 52137
}

var flowJson = [{ id: 'bddc4bca.9aca68', type: 'tab', label: '52137-flow', disabled: false, info: '' }, { id: 'a9c6a2d6.f33a6', type: 'http in', z: 'bddc4bca.9aca68', name: 'Choice HTTP', url: '/choice', method: 'get', upload: false, swaggerDoc: '', x: 310, y: 260, wires: [['42e335c9.421dec']] }, { id: '42e335c9.421dec', type: 'template', z: 'bddc4bca.9aca68', name: 'Sample', field: 'payload', fieldType: 'msg', format: 'handlebars', syntax: 'mustache', template: 'This is the sample payload.', output: 'str', x: 510, y: 260, wires: [['7b416321.4dc20c']] }, { id: '7b416321.4dc20c', type: 'switch', z: 'bddc4bca.9aca68', name: 'CheckCondition', property: 'response', propertyType: 'msg', rules: [{ t: 'eq', v: 'true', vt: 'str' }, { t: 'eq', v: 'false', vt: 'str' }], checkall: 'true', repair: false, outputs: 2, x: 710, y: 260, wires: [['7991ae80.ee379'], ['d9baa9b6.fb1018']] }, { id: '7991ae80.ee379', type: 'template', z: 'bddc4bca.9aca68', name: 'TrueCondition', field: 'payload', fieldType: 'msg', format: 'handlebars', syntax: 'plain', template: 'True Condition Payload.', output: 'str', x: 940, y: 220, wires: [['fcea06b9.85b948']] }, { id: 'd9baa9b6.fb1018', type: 'template', z: 'bddc4bca.9aca68', name: 'FalseCondition', field: 'payload', fieldType: 'msg', format: 'handlebars', syntax: 'plain', template: 'This is false payload.', output: 'str', x: 940, y: 300, wires: [['e2d36f8f.24d0b']] }, { id: 'fcea06b9.85b948', type: 'http response', z: 'bddc4bca.9aca68', name: 'TrueResponse', statusCode: '', headers: {}, x: 1190, y: 220, wires: [] }, { id: 'e2d36f8f.24d0b', type: 'http response', z: 'bddc4bca.9aca68', name: 'FalseResponse', statusCode: '', headers: {}, x: 1190, y: 300, wires: [] }]

stepFunction.init(settings)
console.log(stepFunction.saveData('flow', flowJson))
