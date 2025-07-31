import store from '@/store'
import config from '@/config'
import { getToken } from '@/utils/auth'
import errorCode from '@/utils/errorCode'
import { toast, showConfirm, tansParams } from '@/utils/common'
import { encryptBase64, encryptWithAes, generateAesKey } from '@/utils/crypto';
import { encrypt } from '@/utils/jsencrypt';
import CryptoJS from 'crypto-js';

let timeout = 10000
const baseUrl = config.baseUrl
const clientId = config.clientId

const request = config => {
  // 是否需要设置 token
  const isToken = (config.headers || {}).isToken === false
  config.header = config.header || {}
  if (getToken() && !isToken) {
    config.header['Authorization'] = 'Bearer ' + getToken()
  }
  config.header['Clientid']=clientId
  // get请求映射params参数
  if (config.params) {
    let url = config.url + '?' + tansParams(config.params)
    url = url.slice(0, -1)
    config.url = url
  }
  
  // 是否需要加密
  const isEncrypt = (config.headers || {}).isEncrypt === true;
  // 当开启参数加密
  if (isEncrypt && (config.method === 'post' || config.method === 'put')) {
    console.log('开始加密流程');
    // 生成一个 AES 密钥
    console.log('1. 正在生成 AES 密钥...');
    const aesKey = generateAesKey();
    console.log('AES 密钥已生成');

    console.log('2. 正在 RSA 加密 AES 密钥...');
    config.header['encrypt-key'] = encrypt(aesKey.toString(CryptoJS.enc.Base64));
    console.log('RSA 加密完成');

    console.log('3. 正在 AES 加密请求数据...');
    config.data = typeof config.data === 'object' ? encryptWithAes(JSON.stringify(config.data), aesKey) : encryptWithAes(config.data, aesKey);
    console.log('AES 加密完成');
    
    config.header['Content-Type'] = 'text/plain';
    console.log('加密流程结束');
  }
  return new Promise((resolve, reject) => {
    uni.request({
        method: config.method || 'get',
        timeout: config.timeout ||  timeout,
        url: config.baseUrl || baseUrl + config.url,
        data: config.data,
        header: config.header,
        dataType: 'json'
      }).then(response => {
        let [error, res] = response
        if (error) {
          toast('后端接口连接异常')
          reject('后端接口连接异常')
          return
        }
        const code = res.data.code || 200
        const msg = errorCode[code] || res.data.msg || errorCode['default']
        if (code === 401) {
          showConfirm('登录状态已过期，您可以继续留在该页面，或者重新登录?').then(res => {
            if (res.confirm) {
              store.dispatch('LogOut').then(res => {
                uni.reLaunch({ url: '/pages/login' })
              })
            }
          })
          reject('无效的会话，或者会话已过期，请重新登录。')
        } else if (code === 500) {
          toast(msg)
          reject('500')
        } else if (code !== 200) {
          toast(msg)
          reject(code)
        }
        resolve(res.data)
      })
      .catch(error => {
        let { message } = error
        if (message === 'Network Error') {
          message = '后端接口连接异常'
        } else if (message.includes('timeout')) {
          message = '系统接口请求超时'
        } else if (message.includes('Request failed with status code')) {
          message = '系统接口' + message.substr(message.length - 3) + '异常'
        }
        toast(message)
        reject(error)
      })
  })
}

export default request
