// App carche通过在页面指定manifest文件，并在对页面里指定缓存策略，比如需要缓存的文件列表，以及必须绕过缓存
// 向服务器发起请求的白名单列表以及后备资源列表等等,以后大部分工作都将交给浏览器来完成

// application cache 要求太多
// service通过接口控制  更加灵活

// 基本特性
// 1.是一种工作子线程，不能直接访问/操作dom（使用promise fecth api cache api 在serviceworke里面是全局的）
// 2.完全独立于网页生命周期和上线文环境里，需要时，直接唤醒，不需要自动休眠，不会随着浏览器窗口的关闭而关闭，或者与他关联的站点的关闭而失效
// 3.service相当于一个可编程的网络代理，通过编程，开发者可以通过编程，或者请求结果进行拦截，做缓存处理，缓存的内容是开发者完全可控的
// 4.一旦安装则永远存活，除非用户手动卸载
// 5.必须在https环境下工作（本地环境除外，方便开发者调试）- 太过强大  保证安全
// 6.广泛的应用了promise


// 如何启动
// 注册-》安装-》激活

// 注册和工作的代码是两个独立的代码
// 外联的script

// 注册
// 通知浏览器去那里获取service worker脚本 告知访问位置 让浏览器获取



