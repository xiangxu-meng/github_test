### 标准解读
- Promise只有then方法,没有catch，race，all等方法，甚至没有构造函数
- then方法返回一个新的promise
- 不同的promise的实现需要可以相互调用
- 原子性：Promise的初始状态为pending，它可以由此状态转换为fulfilled（本文为了一致把此状态叫做r          esolved）或者rejected，一旦状态确定，就不可以再次转换为其它状态，状态确定的过程称为settle

***

## 实现Promise
### 构造函数
因为标准并没有指定如何构造一个Promise对象，所以我们同样以目前一般Promise实现中通用的方法来构造一个Promise对象，也是ES6原生Promise里所使用的方式，即：
(```)
// Promise构造函数接收一个executor函数，executor函数执行完同步或异步操作后，调用它的两个参数resolve和reject
var promise = new Promise(function(resolve, reject) {
  /*
    如果操作成功，调用resolve并传入value
    如果操作失败，调用reject并传入reason
  */
})
(```)
构造函数的实现
(```)
function Promise(){
  var _slef = this
  _self.status = 'pending' //Promise 当前的状态
  _self.data = undefined //promise的值
  _self.onResolvedCallback = [] // resolve的回调函数集，因为在Promise结束之前有可能有多个回调添加到它上面
  _self.onRejectedCallback =[]
  executor(resolve,reject) // 执行executor并传入相应的参数
}
(```)
上面是构造函数的主体
- 上面的代码基本实现了Promise构造函数的主体，但目前还有两个问题：
- 我们给executor函数传了两个参数：resolve和reject，这两个参数目前还没有定义
- executor有可能会出错（throw），类似下面这样，而如果executor出错，Promise应该被其throw出的值reject：
```
new Promise(function(resolve, reject) {
  throw 2
})
```
1.需要在构造函数里面定义resolve/reject函数
```
function Promise(executor){
  var _self = this
  _self.status = 'pending'
  _self.data = undefined
  _self.onresolveCallback = []
  _self.onrejectCallback = []
  function resolve (value){
    //TODO
  }
  function reject (err){
    //TODO
  }
  try{
  executor(resolve,reject)
  }catch(e){
    reject(e)
  }
}
```
有人可能会问，resolve和reject这两个函数能不能不定义在构造函数里呢？考虑到我们在executor函数里是以resolve(value)，reject(reason)的形式调用的这两个函数，而不是以resolve.call(promise, value)，reject.call(promise, reason)这种形式调用的，所以这两个函数在调用时的内部也必然有一个隐含的this，也就是说，要么这两个函数是经过bind后传给了executor，要么它们定义在构造函数的内部，使用self来访问所属的Promise对象。所以如果我们想把这两个函数定义在构造函数的外部，确实是可以这么写的：
```
function resolve() {
  // TODO
}
function reject() {
  // TODO
}
function Promise(executor) {
  try {
    executor(resolve.bind(this), reject.bind(this))
  } catch(e) {
    reject.bind(this)(e)
  }
}
```
但是众所周知，bind也会返回一个新的函数，这么一来还是相当于每个Promise对象都有一对属于自己的resolve和reject函数，就跟写在构造函数内部没什么区别了，所以我们就直接把这两个函数定义在构造函数里面了。不过话说回来，如果浏览器对bind的所优化，使用后一种形式应该可以提升一下内存使用效率。
另外我们这里的实现并没有考虑隐藏this上的变量，这使得这个Promise的状态可以在executor函数外部被改变，在一个靠谱的实现里，构造出的Promise对象的状态和最终结果应当是无法从外部更改的。
2.实现resolve和reject
```
function resolve(value){
  if(_self.status == 'pending'){
    _self.status = 'fulfilled',
    _self.data = value
  _self.onresolveCallback.foreach(item = >{
    item(value)
  })
  }
}
 function reject(err) {
    if (self.status === 'pending') {
      self.status = 'rejected'
      self.data = err
      for(var i = 0; i < self.onRejectedCallback.length; i++) {
        self.onRejectedCallback[i](err)
      }
    }
  }
```
基本上就是在判断状态为pending之后把状态改为相应的值，并把对应的value和reason存在self的data属性上面，之后执行相应的回调函数，逻辑很简单，这里就不多解释了。

3.then方法
Promise对象有一个then方法，用来注册在这个Promise状态确定后的回调，很明显，then方法需要写在原型链上。then方法会返回一个Promise，关于这一点，Promise/A+标准并没有要求返回的这个Promise是一个新的对象，但在Promise/A标准中，明确规定了then要返回一个新的对象，目前的Promise实现中then几乎都是返回一个新的Promise(详情)对象，所以在我们的实现中，也让then返回一个新的Promise对象。

关于这一点，我认为标准中是有一点矛盾的：

标准中说，如果promise2 = promise1.then(onResolved, onRejected)里的onResolved/onRejected返回一个Promise，则promise2直接取这个Promise的状态和值为己用，但考虑如下代码：

```
promise2 = promise1.then(function foo(value) {
  return Promise.reject(3)
})
```
此处如果foo运行了，则promise1的状态必然已经确定且为resolved，如果then返回了this（即promise2 === promise1），说明promise2和promise1是同一个对象，而此时promise1/2的状态已经确定，没有办法再取Promise.reject(3)的状态和结果为己用，因为Promise的状态确定后就不可再转换为其它状态。

另外每个Promise对象都可以在其上多次调用then方法，而每次调用then返回的Promise的状态取决于那一次调用then时传入参数的返回值，所以then不能返回this，因为then每次返回的Promise的结果都有可能不同
```
then方法接收两个参数,onResolved，onRejected，分别为Promise成功或失败后的回调
Promise.prototype.then(onResolved,onRejected){
  var self = this
  var promise2
  //如果then的参数不是function，我们要忽略它
  onResolved = typeof onResolved === 'function' ? onResolved : function(v) {}
  onRejected = typeof onRejected === 'function' ? onRejected : function(r) {}

  if(self.status === 'pending'){
    promise2 = new Promise (function(resolve,reject){
      
    })
  }
  if (self.status === 'fullfilled') {
    return promise2 = new Promise(function(resolve, reject) {

    })
  }
  if (self.status === 'rejected') {
    return promise2 = new Promise(function(resolve, reject) {

    })
  }
}

```
Promise总共有三种可能的状态，我们分三个if块来处理，在里面分别都返回一个new Promise。
根据标准，我们知道，对于如下代码，promise2的值取决于then里面函数的返回值：
```
promise2 = promise1.then(function(value) {
  return 4
}, function(reason) {
  throw new Error('sth went wrong')
})
```

如果promise1被resolve了，promise2的将被4 resolve，如果promise1被reject了，promise2将被new Error('sth went wrong') reject，更多复杂的情况不再详述。
所以，我们需要在then里面执行onResolved或者onRejected，并根据返回值(标准中记为x)来确定promise2的结果，并且，如果onResolved/onRejected返回的是一个Promise，promise2将直接取这个Promise的结果：
```
Promise.prototype.then(onResolved,onRejected){
  var self = this
  var promise2
  if(self.status == 'pending'){
    promise2 = new Promise(function(resolve,reject){
    // 如果当前的Promise还处于pending状态，我们并不能确定调用onResolved还是onRejected，
    // 只能等到Promise的状态确定后，才能确定如何处理。
    // 所以我们需要把我们的**两种情况**的处理逻辑做为callback放入promise1(此处即this/self)的回调数组里
    // 逻辑本身跟第一个if块内的几乎一致，此处不做过多解释
    })
  }
}
```
