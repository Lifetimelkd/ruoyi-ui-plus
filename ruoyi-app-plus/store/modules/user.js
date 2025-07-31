import config from '@/config'
import storage from '@/utils/storage'
import constant from '@/utils/constant'
import {
	login,
	logout,
	getInfo
} from '@/api/login'
import {
	getToken,
	setToken,
	removeToken
} from '@/utils/auth'

const baseUrl = config.baseUrl
const user = {
	//状态存储
	state: {
		token: getToken(),
		name: storage.get(constant.name),
		avatar: storage.get(constant.avatar),
		roles: storage.get(constant.roles),
		permissions: storage.get(constant.permissions)
	},
	//状态变化，正常都会被actions调用
	mutations: {
		SET_TOKEN: (state, token) => {
			state.token = token
		},
		SET_NAME: (state, name) => {
			state.name = name
			storage.set(constant.name, name)
		},
		SET_AVATAR: (state, avatar) => {
			state.avatar = avatar
			storage.set(constant.avatar, avatar)
		},
		SET_ROLES: (state, roles) => {
			state.roles = roles
			storage.set(constant.roles, roles)
		},
		SET_PERMISSIONS: (state, permissions) => {
			state.permissions = permissions
			storage.set(constant.permissions, permissions)
		}
	},
	/** 由store自动派发到具体的子状态模块actions中
	   this.$store.dispatch('Login', this.loginForm).then(() => {
			this.$modal.closeLoading()
			this.loginSuccess()
	   }).catch(() => {
			if (this.captchaEnabled) {
				this.getCode()
			}
	   })
   */
	//行为变化-》状态变化
	actions: {
		// 登录
		Login({
			commit
		}, userInfo) {
			// const username = userInfo.username.trim()
			// const password = userInfo.password
			// const code = userInfo.code
			// const uuid = userInfo.uuid
			return new Promise((resolve, reject) => {
				login(userInfo).then(res => {
					res = res.data
					setToken(res.access_token)
					commit('SET_TOKEN', res.access_token)
					resolve()
				}).catch(error => {
					reject(error)
				})
			})
		},

		// 获取用户信息
		GetInfo({
			commit,
			state
		}) {
			return new Promise((resolve, reject) => {
				getInfo().then(res => {
					const user = res.data.user
					const roles = res.data.roles
					const permissions = res.data.permissions
					const avatar = (user == null || user.avatar == "" || user.avatar == null) ?
						require("@/static/images/profile.jpg") : baseUrl + user.avatar
					const username = (user == null || user.userName == "" || user.userName ==
						null) ? "" : user.userName
					if (roles && roles.length > 0) {
						commit('SET_ROLES', roles)
						commit('SET_PERMISSIONS', permissions)
					} else {
						commit('SET_ROLES', ['ROLE_DEFAULT'])
					}
					commit('SET_NAME', username)
					commit('SET_AVATAR', avatar)
					resolve(res)
				}).catch(error => {
					reject(error)
				})
			})
		},

		// 退出系统
		LogOut({
			commit,
			state
		}) {
			return new Promise((resolve, reject) => {
				logout(state.token).then(() => {
					commit('SET_TOKEN', '')
					commit('SET_ROLES', [])
					commit('SET_PERMISSIONS', [])
					removeToken()
					storage.clean()
					resolve()
				}).catch(error => {
					reject(error)
				})
			})
		}
	}
}

export default user