import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import 'element-plus/dist/index.css';
import App from './App.vue';
import router from './router';
import './styles/element-variables.scss';
import './styles/erp-ui.scss';
import './styles/kingdee-order.scss';
import './styles/login.scss';

const app = createApp(App);
app.use(ElementPlus, { locale: zhCn });
app.use(router);
app.mount('#app');
