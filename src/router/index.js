import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'

const roteador = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/',
      name: 'inicio',
      component: DashboardView
    },
    {
      path: '/obras',
      name: 'obras',
      component: () => import('../views/ObrasView.vue')
    },
    {
      path: '/obras/:id',
      name: 'obra-detalhes',
      component: () => import('../views/ObrasDetalhesView.vue')
    },
    {
      path: '/ocorrencias',
      name: 'ocorrencias',
      component: () => import('../views/OcorrenciasView.vue')
    },
    {
      path: '/usuarios',
      name: 'usuarios',
      component: () => import('../views/UsuariosView.vue')
    },
    {
    path: '/ocorrencias/:id/correcao',
    name: 'CorrecaoOcorrencia',
    component: () => import('@/views/CorrecaoOcorrenciaView.vue')
  }
  ]
});

roteador.beforeEach((destino) => {
  const usuarioSalvo = localStorage.getItem('usuario')
  const usuario = usuarioSalvo ? JSON.parse(usuarioSalvo) : null

  if (destino.path !== '/login' && !usuario) {
    return '/login'
  }

  if (usuario && usuario.perfil === 'Montador') {
    const ehPaginaProibida =
      destino.path === '/' ||
      destino.path === '/usuarios'

    if (ehPaginaProibida) {
      return '/obras'
    }
  }
})

export default roteador