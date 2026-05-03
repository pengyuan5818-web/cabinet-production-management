import { defineStore } from 'pinia'
import { auth } from '../api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: JSON.parse(localStorage.getItem('user') || '{}')
  }),
  actions: {
    async login(username, password) {
      const res = await auth.login({ username, password })
      if (res.success) {
        this.token = res.data.token
        this.user = res.data.user
        localStorage.setItem('token', this.token)
        localStorage.setItem('user', JSON.stringify(this.user))
      }
      return res
    },
    logout() {
      this.token = ''
      this.user = {}
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }
})
