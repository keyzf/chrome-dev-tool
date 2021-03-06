## 分支说明

master: 可以使用的稳定代码分支

dev: 开发分支

---

### 基于chrome远程调试协议的调试工具，可用于修改网站代码来测试效果

使用说明：
1. 安装依赖包 `npm install`
2. 运行 `node ./bin`
3. 访问网页时本程序会把加载到的Script和Document类型的文件会写入到data下
4. 修改对应的文件，然后刷新页面看效果

为了查找方便，data文件夹下以网站域名区分文件夹，同一个域名下的文件都会被放在一起。文件命名规则是 `md5(完整请求路径).substr(0, 8)+'_'+文件名`。

例如 http://baidu.com/aa/bb/cc.js 会被写入到 data/baidu.com/xxxxx_cc.js，修改这个文件的内容之后刷新页面，即可生效。

### 背景

作为前端开发，最脑壳疼的问题就是~~破解别人的前端代码和~~定位脚本错误了。除了极少数非常老没人维护的项目，大部分现代项目的线上前端代码都会经过压缩和混淆，这使得调试者仅通过浏览器的代码堆栈定位和格式化功能来查找目标很不方便。我觉得如果能够直接修改网站源代码，然后刷新页面看到修改的效果，那么调试过程就会轻松很多了。

于是我谷歌到了一篇文章 [如何通过Devtools协议拦截和修改Chrome响应数据](https://www.anquanke.com/post/id/160160)，按照文中的代码实现了拦截请求和修改数据的功能。为了更方便的使用，我加上了读写文件的逻辑，让调试者能直接修改源代码，并且实时生效。

目前虽然在处理gbk编码的页面上还存在乱码的问题，不过以后会解决的。

希望这个工具能帮到大家吧。

---

## 20190530更新

#### 【高级用法】编程接口支持，模拟接口更方便
1. 把hooks.sample.js 重命名 hooks.js，打开 https://www.baidu.com/ 查看效果
2. 打开hooks.js，里面有两个方法url2response和should_no_cache
3. 通过编写这两个方法的细节代码，**辅以简单的逻辑判断，即能实现一个简易后台接口系统**
4. 修改这个文件之后主程序会重新读入这个文件，因此并不需要重启进程


#### 目前gbk乱码问题已解决。

#### 更新说明

高级用法适用于后端关联较多的调试流程，例如我最近参与的抽奖需求需要连续签到x天才可以抽奖，断签的可以在最终抽奖日之前补签，如果写定模拟接口数据，那么势必需要多次修改模拟接口的响应值，这显然是比较繁琐的。而通过简单的编程接入，让模拟接口可以包含一些简单的逻辑输出数据，那么调试过程必然轻松不少。

---

## 20190603更新

0. 添加postdata参数，可以在hooks里面得到post的数据
0. 修改错误的缓存逻辑

---

## 20190611更新

0. 增加更多接口响应相关参数和方法，addResponseHeader()添加自定义响应头，deleteResponseHeader删除默认相应头，responseHeaders获取相应头

## 20190613更新

0. 删掉了tools，这个功能基本没有使用的场景，删

## 20190619更新

0. 增加image的拦截
0. 修复buffer类型response的拼接方式
0. url2response允许标记为一个async function，可以使用sleep方法来延迟返回，测试网络超时更方便

## 20190626更新

0. 增加 setStatusCode 方法，可修改响应头状态码

## 20190630更新

0. 增加编程接口外部文件引用方式，可以在 hooks.js 中自定义引入项目文件夹中的hooks.js，切换项目更方便

## 20190704更新

0. 增加 requestPipe 方法，该方法可以把请求数据转发到目标服务器，支持参数
```
{
  requestOrigin: 目标服务器接受的请求来源
  responseOrigin: 目标服务器来源
  timeout: 转发请求超时
}
```
requestOrigin和responseOrigin，仅包含协议、域名及端口号，例如：
http://example.com:81
https://example.com
都是合法的origin

0. 增加 updateCORSHeaders 方法，覆盖跨域头部的快捷写法

## 20190705更新

0. 增加 WRITE_CACHE 开关，false时不会写入文件缓存，实测大多数情况下文件缓存不是必要的。默认false，如有必要修改缓存文件来调试，则把这个开关定义为true

0. 修复新开页面不能调试的问题（立即点开的页面依然不会被CDP捕获，目前暂无解决方案 https://github.com/GoogleChrome/puppeteer/issues/3667）

0. 增加 网络请求超时参数 NETWORK_TIMEOUT，不设置默认10秒

## 20190708更新

0. 目前已知bug：
  - 新开tab必须在cdp建立连接之后刷新页面，否则初始请求不会被捕获到
  - postData太长会被cdp协议忽略掉，因此这类请求无法使用默认结果

## 20190709更新

0. postData通过代理请求的方式获取，无论数据多长都可以被捕捉到
0. 删除 updateCORSHeaders 方法，默认自动补上跨域头部
0. 由于跳转代理之后Set-Cookie头部会被忽略，具体原因未知，目前使用一个动态请求来设置cookie，具体见代码 libs/common.js `callSetCookiePage` 方法及index.js的注入cookie部分

## 20190710更新

0. 增加 --usr-data-dir 启动参数，指定浏览器数据保存位置
0. 增加 runScriptOnUrlChange 编程接口，该接口代码会在 domcontentloaded 事件触发之后被调用，运行于node上下文

## 20190711更新

0. 增加 waitForResponse() 方法，调用之后 通过 getResponse() 和 getResponseHeader() 获得服务端输出数据
0. 去掉 WRITE_CACHE 参数，去掉 url2filename，should_no_cache 接口，新增 url2cachefile接口，返回 字符串 的，缓存写入该字符串文件名，返回true的，根据默认url2cachefile规则写入文件缓存。返回 非真值，不写入缓存

## 20190712更新

0. 修复referer问题，禁用浏览器自带referer头部，转发请求补上referer，以防触发 network client blocked

## 20190715更新

0. 修改获取参数的方式，先用一段时间试试看有没有问题。测试了几个页面验证登录cookie及带referer校验的资源均可以正常获取，但location.hash会丢失，暂未找到获取hash的办法

## 20190717更新

0. 不需要postData的请求不再从代理绕弯了，这样更快

## 20190724更新

0. 增加代码注入式编程接口，开发爬虫类工具更方便。见 test-inject-tool.js

0. 增加useragent参数，可以动态修改浏览器页面的useragent

## 20190912更新

0. 去掉了内部转发请求获取postData的功能，因为转发牵涉的问题太多，如请求来源，跨域等，不容易解决

## 20200101更新

0. 增加queryAll字段，可直接获取url里的参数

## 20200204更新

0. 增加 cacheUrlBy，cacheData，cacheClear 方法，用于缓存请求结果数据，当缓存存在时，无需访问目标服务器即可返回之前的响应结果

## 20200221更新

0. url2response如果return true，则该请求直接到达目标服务器，不会被拦截处理。return undefined和return true目前意义是一致的，但表现形式有区别，undefined会进入本调试器的处理逻辑，但有些情况下会有bug，已知的是特定情况下cookie无法获取到，但尚未被解决。因此使用者可以用return true来替代return undefined，后期可能会解决这个问题。。

## 20200229更新

0. 当url2cachefile返回文件名或者true时，不会再进入url2response方法

