const CDP = require('chrome-remote-interface')
const puppeteer = require('puppeteer-core')
const path = require('path')

const findChrome=_=>{
  // return require('chrome-finder')
  return require("chrome-launcher").Launcher.getInstallations()[0]
}

const get_apis=require('./get_apis')
const do_hooks=require('./do_hooks')
const {sleep, getPageUrl, sandboxTool, deleteHeader, headers2kvheaders, getArgv}=require('./common')

exports.hookRequest=async (request, pageId)=>{
  const {url, method, postData, headers}=request
  const hooks=get_apis()
  const fetchObj=Object.assign({
    url, method, postData, headers,
    timeout: hooks.network_timeout,
  }, hooks)
  return await do_hooks(fetchObj, pageId)
}

exports.watchClient=async (onClient, headless, hooks_js, defaultUrl)=>{
  const targetsHooked={}
  const args=[
    '--disable-pnacl-crash-throttling',
    '--disable-breakpad',
    '--enable-features=NetworkService,NetworkServiceInProcess',
    '--auto-open-devtools-for-tabs',
    '--no-first-run',
    '--user-data-dir='+path.normalize(getArgv('browser-data-dir') || __dirname+'/../../browser-data'),
  ]
  if(getArgv('no-sandbox')) args.push('--no-sandbox')
  if(headless) args.unshift('--headless')
  if(hooks_js) global.HOOKS_JS_INJECT=hooks_js
  const browser=await puppeteer.launch({
    defaultViewport: null,
    ignoreDefaultArgs: true,
    args,
    executablePath: findChrome(),
  })

  const options={
    host: '127.0.0.1',
    port: browser.wsEndpoint().replace(/^.*\/\/.*?\:(\d+).*/,'$1'),
  }

  // https://github.com/GoogleChrome/puppeteer/issues/3667
  // 新开页面到cdp可以博捕捉之间有一段空隙时间，这段时间无法注入代码，暂无解决方案
  // 目前我所使用的reload方式，仅仅让新页面在和cdp建立连接之后重新载入，但在reload之前所发出的请求已确实被后台所记录了
  // 所以这个方式治标不治本，在特定情况下会引入其他错误。例如页面打开之后调用了统计访问次数的接口，那么这个接口就有可能被调用两次

  const defaultUserAgent=await browser.userAgent()
  const bindTarget=async target=>{
    const page=await target.page()
    if(!page) return
    const {targetId}=target._targetInfo
    if(targetsHooked[targetId]) return 1
    targetsHooked[targetId]=1
    const client=await CDP(Object.assign({target: targetId}, options))
    await onClient(client, page)
    for(;;) {
      try{
        if(await page.evaluate(_=>document.readyState==='complete')) break
      }catch(e){}
      await sleep(50)
    }
    ; (async _=>{
      for(let _url='', _lst='';; ) {
        try{
          const lst=await page.evaluate(_=>{
            return window.__CHROME_DEV_TOOL_LOCK_KEY=window.__CHROME_DEV_TOOL_LOCK_KEY || Math.random()
          })
          if(lst!==_lst) _url=''
          _lst=lst
        }catch(e){
          if(page.isClosed()) break
        }
        await sleep(50)
        const url=await getPageUrl(page)
        if(!url || url===_url) continue
        page.__DEV_URL__=_url=url
        const {runScriptOnUrlChange, useragent}=get_apis()
        await page.setUserAgent(useragent || defaultUserAgent)
        if(!runScriptOnUrlChange) return;
        runScriptOnUrlChange(await sandboxTool(page))
      }
    })()
    for(;!page.__DEV_URL__;) await sleep(1e2)
    const {useragent}=get_apis()
    await page.setUserAgent(useragent || defaultUserAgent)
    await page.reload()
    page.__BINDED__=true
  }
  browser.targets().map(bindTarget)
  ; ['targetcreated', 'targetchanged'].map(t=>browser.on(t, bindTarget))

  browser.on('disconnected', _=>{
    process.exit()
  })

  if(defaultUrl) {
    const page=(await browser.pages())[0]||(await browser.newPage())
    await page.goto(await defaultUrl)
  }

  return browser
}
