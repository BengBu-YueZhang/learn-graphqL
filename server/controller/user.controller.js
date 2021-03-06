const UserModel = require('../models/user.model')
const { getSkip } = require('../util')
const { is, isEmpty } = require('ramda')
const bcrypt = require('../config/bcrypt')
const jwt = require('jsonwebtoken')
const config = require('../config')
const { promisify } = require('util')
const redisClient = require('../config/redis')
const setAsync = promisify(redisClient.set).bind(redisClient)
const delAsync = promisify(redisClient.del).bind(redisClient)

module.exports = {
  async login (ctx, next) {
    try {
      console.log('login con1')
      const { name, password } = ctx.request.body
      if (isEmpty(name)) {
        ctx.throw(400, `name不能为空`)
      }
      console.log('login con1.1')
      if (isEmpty(password)) {
        ctx.throw(400, `password不能为空`)
      }
      const user = await UserModel.findOne({ name })
      if (!user) {
        ctx.throw(400, `用户不存在`)
      }
      console.log('login con1.2')
      const equal = await bcrypt.compare(user.password, password)
      if (!equal) {
        ctx.throw(400, `密码错误`)
      }
      console.log('login con2')
      // 生成token
      const token = jwt.sign(
        {
          id: user._id
        },
        config.jwt.secret,
        {
          expiresIn: config.jwt.timeout
        }
      )
      console.log('login con3')
      const redisKey = user._id.toString()
      await setAsync(redisKey, token, 'EX', config.jwt.timeout)
      console.log('login con4')
      ctx.result = {
        code: 200,
        msg: 'success',
        token
      }
      await next()
    } catch (error) {
      throw error
    }
  },

  async logout (ctx, next) {
    try {
      const { id } = ctx.decoded
      await delAsync(id)
    } catch (error) {
      throw error
    }
  },

  /**
   * 获取用户列表
   * @param {Number} pagestart 开始位置
   * @param {Number} pagesize 大小
   */
  async getUsers (ctx, next) {
    try {
      let { pagestart, pagesize } = ctx.request.query
      let { skip, limit } = getSkip(pagestart, pagesize, ctx)
      const data = await UserModel.find(null, null, {
        skip,
        limit
      })
      ctx.result = {
        data,
        msg: 'success',
        code: 200
      }
      await next()
    } catch (error) {
      throw error
    }
  },

  async getUserById (ctx, next) {
    try {
      const { id } = ctx.request.query
      if (isEmpty(id)) {
        ctx.throw(400, `id不能为空`)
      }
      if (!is(String, id)) {
        ctx.throw(400, `id必须是字符串`)
      }
      const data = await UserModel.findById(id)
      ctx.result = {
        data,
        msg: 'success',
        code: 200
      }
      await next()
    } catch (error) {
      throw error
    }
  },

  async getCurrentUser (ctx, next) {
    try {
      const { id } = ctx.decoded
      const data = await UserModel.findById(id)
      ctx.result = {
        data,
        msg: 'success',
        code: 200
      }
      await next()
    } catch (error) {
      throw error
    }
  },

  async addUser (ctx, next) {
    try {
      let { name, password } = ctx.request.body
      if (isEmpty(name)) {
        ctx.throw(400, `name不能为空`)
      }
      if (isEmpty(password)) {
        ctx.throw(400, `password不能为空`)
      }
      if (!is(String, name)) {
        ctx.throw(400, `name必须是字符串`)
      }
      if (!is(String, password)) {
        ctx.throw(400, `password必须是字符串`)
      }
      let user = await UserModel.findOne({ name })
      if (user) {
        ctx.throw(400, `用户名重复`)
      }
      password = bcrypt.encrypt(password)
      user = new UserModel({ name, password })
      await user.save()
      ctx.result = {
        msg: 'success',
        code: 200
      }
      await next()
    } catch (error) {
      throw error
    }
  },

  async updateUser (ctx, next) {
    try {
      const { id, name } = ctx.request.body
      if (isEmpty(id)) {
        ctx.throw(400, `id不能为空`)
      }
      if (!is(String, id)) {
        ctx.throw(400, `id必须是字符串`)
      }
      if (isEmpty(name)) {
        ctx.throw(400, `name不能为空`)
      }
      if (!is(String, name)) {
        ctx.throw(400, `name必须是字符串`)
      }
      await UserModel.findByIdAndUpdate({
        _id: id
      }, {
        $set: {
          name
        }
      })
      ctx.result = {
        msg: 'success',
        code: 200
      }
      await next()
    } catch (error) {
      throw error
    }
  }
}
