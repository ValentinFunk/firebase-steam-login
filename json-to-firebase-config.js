// For setting firebase config as json 
// https://medium.com/@AllanHasegawa/setting-config-for-firebase-cloud-functions-with-json-136f455e7c69

const stdin = process.openStdin()
const spawn = require('child_process').spawn
const changeCase = require('change-case');

function read() {
  return new Promise((resolve, reason) => {
    stdin.addListener("data", function (d) {
      resolve(d.toString().trim())
    });
  });
}

function isObj(x) {
  return x !== null && typeof x === 'object'
}

function parse(tree) {
  const values = []
  const properties = Object.keys(tree)
  properties.forEach(prop => {
    if (isObj(tree[prop])) {
      const childrens = parse(tree[prop])
      childrens.forEach(child => {
        const value = changeCase.paramCase(prop) + "." + child
        values.push(value)
      })
    } else {
      const value = changeCase.paramCase(prop) + "=" + "\"" + tree[prop] + "\""
      values.push(value)
    }
  })

  return values
}

function runFirebaseConfigSet(properties) {
  return new Promise((resolve, reject) => {
    const args = ["functions:config:set"].concat(properties)
    const cmd = spawn("firebase", args, { shell: true })
    cmd.stdout.setEncoding('utf8')
    cmd.stdout.on('data', data => { console.log(data) })
    cmd.stderr.on('data', data => { console.error("Error:", cmd.stderr.toString()) })
    cmd.on('close', code => {
      console.log(`Exit code: ${code}`)
      resolve(code)
    })
  })
}

read()
  .then(input => {
    const json = JSON.parse(input)
    const properties = parse(json)
    console.log("Found properties:\n", properties.map(it => "\t▷ " + it).join("\n"))
    return properties
  })
  .then((properties) => runFirebaseConfigSet(properties))