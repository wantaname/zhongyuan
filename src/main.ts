import './assets/main.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import App from './App.vue'
import router from './router'
import Aura from '@primevue/themes/aura'
import Nora from '@primevue/themes/nora'
import Lara from '@primevue/themes/lara'
import Material from '@primevue/themes/material'
import 'primeicons/primeicons.css'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'

// import '@/mock/index'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ConfirmationService)

app.use(PrimeVue, {
  theme: {
    preset: Lara,
  },
  locale: {
    today: '今天',
    clear: '清除',
    //...
  },
})
app.use(ToastService)

app.mount('#app')
