import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:5174/api'
})



api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  let usuarioId = null
  try {
    const dados = JSON.parse(localStorage.getItem('usuario') || '{}')
    const userObj = dados.usuario || dados
    usuarioId = Number(userObj.id || userObj.Id || userObj.usuarioId || userObj.idUsuario) || null
  } catch {
    usuarioId = null
  }

  if (usuarioId) {
    config.params = {
      usuarioId,
      ...config.params
    }

    if (
      config.data &&
      typeof config.data === 'object' &&
      !(config.data instanceof FormData) &&
      !config.data.usuarioId &&
      !config.data.UsuarioId
    ) {
      config.data = {
        ...config.data,
        usuarioId
      }
    }
  }

  return config
})

export default api