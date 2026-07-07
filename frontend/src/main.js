import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { captureAttributionFromLocation } from './utils/attribution'

captureAttributionFromLocation()

createApp(App).use(router).mount('#app')
