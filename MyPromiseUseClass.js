/**
 * 自定义Promise函数模块：IIFE
 */
(function (window) {

  const PENDING = 'pending'
  const RESOLVED = 'resolved'
  const REJECTED = 'rejected'

  /**
   * Promise：构造函数
   * excutor:执行器函数
   */
  class MyPromise {
    constructor(excutor) {
      const self = this//储存this
      this.status = PENDING//给promise对象指定status属性，初始值为pending
      this.data = undefined//给promise对象指定一个用于储存结果数据的属性
      this.callbacks = []//每个元素的结构：{onResolved() {}, onRejected() {}}

      function resolve(value) {
        //只能更改一次状态
        if (self.status !== PENDING) {
          return
        }
        //将状态改为resolvedself
        self.status = RESOLVED
        //保存value数据
        self.data = value
        //如果有待执行的callbacks函数，立即异步执行回调函数
        if (self.callbacks.length > 0) {
          setTimeout(() => {// 放入队列中执行所有成功的回调
            self.callbacks.forEach(callbacksObj => {
              callbacksObj.onResolvedSave(value)
            })
          })
        }
      }

      function reject(reason) {
        //只能更改一次状态
        if (self.status !== PENDING) {
          return
        }
        //将状态改为rejected
        self.status = REJECTED
        //保存value数据RESOLVED
        self.data = reason
        //如果有待执行的callbacks函数，立即异步执行回调函数
        if (self.callbacks.length > 0) {
          setTimeout(() => {// 放入队列中执行所有成功的回调
            self.callbacks.forEach(callbacksObj => {
              callbacksObj.onRejectedSave(reason)
            })
          })
        }
      }

      //立即同步执行excutor
      try {//如果执行器抛出异常，promise对象变为rejected
        excutor(resolve, reject)
      } catch (error) {
        reject(error)
      }
    }

    /**
     * Promise原型对象的then()
     * 指定成功或失败的回调函数
     * 返回一个新的promise对象,其结果由onResolved/onRejected执行的结果来决定
     */

    then(onResolved, onRejected) {
      //如果没自定义成功的回调函数向后传递成功的value
      onResolved = typeof onResolved === 'function' ? onResolved : value => value
      //实现异常穿透,指定默认失败的回调
      onRejected = typeof onRejected === 'function' ? onRejected : reason => {
        throw reason
      }

      const self = this
      //返回一个新的promise对象
      return new MyPromise((resolve, reject) => { //new Promise时立即执行以下异步回调
        //封装一个函数简洁代码
        function handle(callback) {
          /**
           * 1.如果执行抛出异常，return的promise会失败，失败的reason是error
           * 2.如果回调函数返回值非promise，return的promise就会成功，value就是返回的值
           * 3.如果回调函数返回的是promise，return的promise就是这个promise的结果
           */
          try {
            const result = callback(self.data)
            if (result instanceof MyPromise) {
              // 如果回调函数返回的是promise，return的promise就是这个promise的结果
              //正常写法：
              // result.then(
              //   value => {resolve(value)},
              //   reason => {reject(reason)}
              // )
              //简洁写法：
              result.then(resolve, reject)
            } else {
              // 如果回调函数返回值非promise，return的promise就会成功，value就是返回的值
              resolve(result)
            }
          } catch (error) {
            // 如果执行抛出异常，return的promise会失败，失败的reason是error
            reject(error)
          }
        }

        //当前状态还是pending状态(先指定回调函数)，将回调函数保存起来
        if (self.status === PENDING) {
          self.callbacks.push({
            onResolvedSave() {
              handle(onResolved)
            },
            onRejectedSave() {
              handle(onRejected)
            }
          })
        } else if (self.status === RESOLVED) { //当前状态是resolve，立即执行异步onResolved回调函数
          setTimeout(() => {
            handle(onResolved)
          })
        } else { //当前状态是rejected，立即执行异步onRejected回调函数
          setTimeout(() => {
            handle(onRejected)
          })
        }
      })


    }

    /**
     * Promise原型对象的catch()
     */
    catch(onRejected) {
      return this.then(undefined, onRejected)
    }

    /**
     * Promise函数对象的方法resolve
     * 返回一个指定成功的promise
     */
    static resolve = function (value) {
      return new MyPromise((resolve, reject) => {
        //value是promise
        if (value instanceof MyPromise) { //使用value的结果作为promise的结果
          value.then(resolve, reject)
        } else { //value不是promise
          resolve(value)
        }
      })
    }

    /**
     * Promise函数对象的方法reject
     * 返回一个指定失败的promise
     */

    static reject = function (reason) {
      //返回一个失败的promise
      return new MyPromise((resolve, reject) => {
        reject(reason)
      })
    }

    /**
     * Promise函数对象的方法all
     */

    static all = function (MyPromises) {
      const values = new Array(MyPromises.length) //保存所有成功的value
      let i = 0 //创建一个保存成功次数的计数器
      return new MyPromise((resolve, reject) => {
        //遍历所有promise获取每个promise的结果
        MyPromises.forEach((p, index) => {
          //如果传入的有不是promise的，包装成promise
          MyPromise.resolve(p).then(
            value => {
              i++//成功一个数量加一
              //p成功，将成功的value放入values
              values[index] = value
              //如果全部完成了，将return的promise改为成功
              if (i === MyPromises.length) {
                resolve(values)
              }
            },
            reason => {
              reject(reason)
            }
          )
        })
      })
    }

    /**
     * Promise函数对象的方法race
     * 结果由第一个完成的promise决定
     */

    static  race = function (MyPromises) {
      return new MyPromise((resolve, reject) => {
        MyPromises.forEach((p, index) => {
          MyPromise.resolve(p).then(
            value => {
              resolve(value)//只有第一次调用才有效果
            },
            reason => {
              reject(reason)//只有第一次调用才有效果
            }
          )
        })
      })
    }

    /**
     * 自定义1：
     * 返回一个promise对象，它在指定时间后才确定结果
     */

    static  resolveDelay = function (value, time) {
      return new MyPromise((resolve, reject) => {
          setTimeout(
            () => {
              //value是promise
              if (value instanceof MyPromise) { //使用value的结果作为promise的结果
                value.then(resolve, reject)
              } else { //value不是promise
                resolve(value)
              }
            }
            , time)
        }
      )
    }

    /**
     * 自定义2：
     * 返回一个promise对象，它在指定时间后才失败
     */

    static rejectDelay = function (reason, time) {
      setTimeout(() => {
        //返回一个失败的promise
        return new MyPromise((resolve, reject) => {
          reject(reason)
        })
      }, time)
    }
  }

  window.MyPromise = MyPromise
})(window)



