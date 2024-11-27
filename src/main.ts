import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import App from './App.vue'
import router from './router'
import Aura from '@primevue/themes/lara'
import Material from '@primevue/themes/material'
import 'primeicons/primeicons.css'
import ToastService from 'primevue/toastservice'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: Material,
  },
})
app.use(ToastService)

app.mount('#app')
