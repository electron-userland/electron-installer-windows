var fs = require('fs')

module.exports = function (chai, utils) {
  var Assertion = chai.Assertion

  utils.addProperty(Assertion.prototype, 'exist', function () {
    var exists = false

    try {
      exists = fs.accessSync(this._obj) || true
    } catch (e) {
    }

    this.assert(
      exists,
      'expected #{this} to exist',
      'expected #{this} to not exist'
    )
  })
}
