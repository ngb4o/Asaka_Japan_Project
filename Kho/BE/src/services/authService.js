import bcrypt from 'bcryptjs'
import { StatusCodes } from 'http-status-codes'
import { env } from '~/config/environment'
import { userModel } from '~/models/userModel'
import ApiError from '~/utils/ApiError'
import { jwtHelper } from '~/utils/jwt'

const publicUser = (user) => ({
  id: user._id.toString(),
  username: user.username,
  name: user.name
})

const login = async ({ username, password }) => {
  const user = await userModel.findByUsername(username)
  const matched = user ? await bcrypt.compare(password, user.passwordHash) : false
  if (!user || !matched) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Sai tên đăng nhập hoặc mật khẩu')
  }

  const token = jwtHelper.generateToken({
    userId: user._id.toString(),
    username: user.username,
    name: user.name
  })

  return { token, user: publicUser(user) }
}

const ensureAdmin = async () => {
  if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD) {
    return { created: false, reason: 'missing-env' }
  }
  if (env.ADMIN_PASSWORD.length < 6) {
    return { created: false, reason: 'short-password' }
  }

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10)
  const name = env.ADMIN_NAME || 'Quản kho'
  const existing = await userModel.findByUsername(env.ADMIN_USERNAME)

  if (!existing) {
    await userModel.createNew({
      username: env.ADMIN_USERNAME,
      passwordHash,
      name
    })
    return { created: true, username: env.ADMIN_USERNAME }
  }

  await userModel.updateByUsername(env.ADMIN_USERNAME, { passwordHash, name })
  return { created: false, reason: 'updated', username: env.ADMIN_USERNAME }
}

export const authService = {
  login,
  ensureAdmin,
  publicUser
}
