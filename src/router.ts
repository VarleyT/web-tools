import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import { findTool } from './tools/registry'

const SITE_NAME = 'ByteGrep Tool'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/tool/:id', name: 'tool', component: () => import('./views/ToolView.vue'), props: true },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  const tool = typeof to.params.id === 'string' ? findTool(to.params.id) : undefined
  document.title = tool ? `${tool.name} - ${SITE_NAME}` : SITE_NAME
})
