const vorpal = require('vorpal')();
const VorpalUtil = require('vorpal/dist/util')
const fs = require('fs')
const path = require('path')
var request = require('request-promise-native')

const SESSION_INFO_PATH = path.join(__dirname, '.session.json')

var session = null
var lastCreds = {}
try { lastCreds = JSON.parse(fs.readFileSync(SESSION_INFO_PATH)) }
catch (e) {}

// login
// =

vorpal
  .command('login', 'Login to the server')
  .action(async function (args) {
    // get creds
    var creds = await this.prompt([
      {type: 'input', name: 'host', message: 'Host: ', default: lastCreds.host},
      {type: 'input', name: 'username', message: 'Username: ', default: lastCreds.username},
      {type: 'password', name: 'password', message: 'Password: '}
    ])

    // save last-used creds
    lastCreds = {host: creds.host, username: creds.username}
    fs.writeFileSync(SESSION_INFO_PATH, JSON.stringify(lastCreds))
    
    // attempt login
    var res = await request.post({
      baseUrl: creds.host,
      resolveWithFullResponse: true,
      simple: false,
      uri: '/v1/login',
      json: { username: creds.username, password: creds.password }
    })
    if (res.statusCode !== 200) {
      return this.log(res.body.message)
    }

    this.log('Success.')
    vorpal.delimiter(creds.username + '$')
    session = {
      username: creds.username,
      auth: { bearer: res.body.sessionToken }
    }

    // configure requester
    request = request.defaults({
      baseUrl: creds.host,
      resolveWithFullResponse: true,
      simple: false,
      json: true,
      auth: session.auth
    })
  })

// list users
// =

vorpal
  .command('list-users')
  .option('-s, --sort <sort>', 'What to sort users by.', ['id', 'username', 'email'])
  .option('-r, --reverse', 'Reverse the sort.')
  .action(async function (args) {
    if (!session) return this.log('Login required.')

    // fetch
    var res = await request.get({
      uri: '/v1/admin/users',
      qs: {
        sort: args.options.sort,
        reverse: args.options.reverse ? 1 : 0
      }
    })
    if (res.statusCode !== 200) {
      return this.log(res.body.message)
    }

    // render output
    this.log(col('', 5), col('id', 10), col('username', 15), col('email', 20), col('', 9))
    res.body.users.forEach(user => {
      this.log(...formatUserRow(user))
    })
  })

// get user
// =

vorpal
  .command('user <id>', 'Show user record. (ID, username, or email.)')
  .option('-a, --archives', 'Show user archives.')
  .action(async function (args) {
    if (!session) return this.log('Login required.')

    // fetch
    var res = await request.get({
      uri: '/v1/admin/users/' + args.id,
    })
    if (res.statusCode !== 200) {
      return this.log(res.body.message)
    }

    // render output
    this.log(formatUserRecord(res.body, args.options))
  })

// suspend
// =

vorpal
  .command('suspend <id> [reason...]', 'Suspend the user. (ID, username, or email.)')
  .action(async function (args) {
    if (!session) return this.log('Login required.')

    // suspend
    var res = await request.post({
      uri: '/v1/admin/users/' + args.id + '/suspend',
      json: {reason: (args.reason ? args.reason.join(' ') : undefined)}
    })
    if (res.statusCode !== 200) {
      return this.log(res.body.message)
    }

    // render output
    this.log('Done.')
  })

// unsuspend
// =

vorpal
  .command('unsuspend <id>', 'Unsuspend the user. (ID, username, or email.)')
  .action(async function (args) {
    if (!session) return this.log('Login required.')

    // suspend
    var res = await request.post({
      uri: '/v1/admin/users/' + args.id + '/unsuspend'
    })
    if (res.statusCode !== 200) {
      return this.log(res.body.message)
    }

    // render output
    this.log('Done.')
  })

// start
// =

vorpal
  .delimiter('$')
  .show()

// rendering helpers
// =

function col (str, width) {
  const {pad} = VorpalUtil
  if (str.length > width) {
    str = str.slice(0, width)
  }
  return pad(str, width)
}

function isAdmin (user) {
  return user.scopes.filter(s => s.startsWith('admin:')).length > 0
}

function formatUserRow (user) {
  return [
    col(isAdmin(user) ? 'admin' : '', 5),
    col(user.id, 10),
    col(user.username, 15),
    col(user.email, 20),
    col(user.suspension ? 'suspended' : '', 9)
  ]
}

function formatUserRecord (user, opts) {
  if (opts.archives) {
    return user.archives
  }

  delete user.archives
  for (var k in user) {
    if (k === 'createdAt' || k === 'updatedAt') {
      user[k] = (new Date(user[k])).toLocaleString()
    }
  }
  return user
}