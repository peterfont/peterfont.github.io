//模拟MVC手动实现功能
$(function(){
    var Events = function(){};
    Events.prototype = {
        filter:function(){
            if(!this.eventsList) this.eventsList = {};
        },
        on:function(event,cb){//增加监听
            this.filter();
            return (this.eventsList[event] || (this.eventsList[event] = [])).push(cb);
        },
        off:function(event,cb){//移除监听
            this.filter();

            var index = -1;

            if(!this.eventsList[event]) return false;

            index = this.eventsList[event].indexOf(cb);

            return index >= 0 && this[event].splice(index,1);
        },
        trigger:function(event){//触发事件

            this.filter();

            var events = this.eventsList[event];
            var i,len;
            if(events && events.length > 0){
                i= 0;
                len = events.length;
                while(i<len){
                    events[i++]();

                }
            }
        }
    };

    //创建event

    //var e = new Events();
    //var func = function(){
    //    //func
    //};
    //e.on("click",function(){
    //    //click
    //});
    //e.on("click",func);
    //e.trigger("click");
    //
    //e.off("click",func);
    //e.trigger("click");


    //原型扩展
    function augment(rc,gc){
        if(arguments[2]){//继承指定的方法
            for(var i=2,len=arguments.length;i<len;i++){
                rc.prototype[arguments[i]] = gc.prototype[arguments[i]];
            }
        }else{
            for(var pro in gc.prototype){
                if(!rc.prototype[pro]){
                    rc.prototype[pro] = gc.prototype[pro];
                }
            }
        }
    }


    //创建id
    var uuid = (function(){
        var count = 0;
        return function(){
            return count++;
        }
    })();

    //代办事项模型
    var Todo = (function() {

        var Todo = function (title) {
            this.title = title;
            this.init();
        };
        Todo.prototype = {
            init: function () {
                this.done = false;
                this.id = uuid();
            },
            set: function (pro, val) {
                this[pro] = val;
                this.trigger("change");
            },
            destory: function () {
                this.trigger("destory");
            }
        };
        return Todo;
    })();

    //掺元类扩展
    augment(Todo,Events);


    //实现一个collection
    //待办事项collection
    var TodoList = (function(mod){
        var model = mod;
        var TodoList = function(){
            this.list = [];
            this.init();
        };
        TodoList.prototype = {
            init:function(){

            },
            create:function(m){
                var mod  = new model(m.title);
                mod.on("destory",this.remove(mod));
                this.list.push(mod);
                this.trigger("change");
                return mod;
            },
            remove:function(mod){
                var _this = this;
                return function(){
                    var index = -1;
                    _.filter(_this.list,function(item,i){
                        if(mod.id == item.id){
                            index = i;
                            return true;
                        }
                    });
                    if(index >= 0){
                        _this.list.splice(index,1);
                        _this.trigger("change");
                    }
                }
            },
            removeDone:function(){
                _.each(_.where(this.list,{done: true}),function(item){
                    item.destory();
                });
            },
            done:function(){
                return _.where(this.list,{done: true}).length;
            },
            remaining:function(){
                return _.where(this.list,{done: false}).length;
            },
            getList:function(){
                return this.list;
            },
            doneAll:function(bol){
                _.each(this.list,function(item){
                    item["done"] = bol;
                    item.trigger("done");
                });
                this.trigger("change");
            }
        };
        return TodoList;
    })(Todo);

    //掺元类扩展
    augment(TodoList,Events);

    //初始化一个列表
    var Todos = new TodoList();

    //待办事项视图
    var TodoView = (function(element,template){
        var ele = element,tpl = template;
        var TodoView = function (mod){
            this.mod = mod;
            this.init();
        };
        TodoView.prototype = {
            init:function(){//初始化事件
                var _this = this;
                _this.ele = $("<"+ele+"></"+ele+">");
                _.each(_.keys(this.events),function(key){
                    var arr =  /(^\b\w+\b\s*)/g.exec(key),
                        event = arr[0].trim(),
                        ele1 = key.substring(arr.index + arr[0].length,key.length),
                        func = _this.events[key];
                    $(_this.ele).on(event,ele1,function(e){
                        return func.call($(this),e,_this);
                    });
                });
                //初始化监听
                this.mod.on("change",function(){
                    _this.render();
                });
                //初始化done
                this.mod.on("done",function(){
                    if(!_this.mod.done){
                        _this.ele.removeClass("done");
                        _this.ele.find(".toggle").removeAttr("checked");
                    }else{
                        _this.ele.addClass("done");
                        _this.ele.find(".toggle").attr("checked",true);
                    }
                });

                this.mod.on("destory",function(){
                    _this.remove();
                });
            },
            render:function(){//返回渲染的模板
                return this.ele.html(tpl(this.mod));
            },
            remove:function(){
                return this.ele.remove();
            },
            events:{
                "click .toggle":function(e,item){//选中元素
                    item.mod["done"] = !!$(this).attr("checked");
                    item.mod.trigger("done");
                    Todos.trigger("change");
                },
                "click .destroy":function(e,item){//删除
                    item.mod.destory();
                },
                "dblclick .view":function(e,item){//进入编辑模式
                    item.ele.addClass("editing");
                    item.render();
                },
                "blur .edit":function(e,item){//退出编辑
                    item.ele.removeClass("editing");
                    item.render();
                },
                "keyup .edit":function(e,item){//编辑
                    if(e.which == "13"){
                        e.preventDefault();
                        item.ele.removeClass("editing");
                        item.mod.set("title",$(this).val());
                        return false;
                    }
                }
            }
        };

        return TodoView;

    })("li",_.template($("#item-template").html()));

    //view功能 单一
    //初始化UI
    //绑定事件
    //var v = new TodoView({model:{title:"aaa"}});


    //视图是单例的,model可以创建多个的;
    //APP的视图
    var AppView = (function(element,template,main,footer){
        var ele = element;
        var AppView = function(){
            this.stateTemplate = template;
            this.main = main;
            this.footer= footer;
            this.init();
        };
        AppView.prototype = {
            init:function(){
                var _this = this;
                _.each(_.keys(this.events),function(key){
                    var arr =  /(^\b\w+\b\s*)/g.exec(key),
                        event = arr[0].trim(),
                        ele1 = key.substring(arr.index + arr[0].length,key.length),
                        func = _this.events[key];
                    $(ele).on(event,ele1,function(e){
                        return func.call($(this),e,_this);
                    });
                });
                //监听Todos的变化
                Todos.on("change",function(){
                    _this.render(Todos);
                });
                //初始化
                _this.render(Todos);
            },
            render:function(list){
                var done = 0,remaining = 0,len = list.getList().length;
                if(len > 0){
                    this.main.show();
                    this.footer.show();
                    done =  list.done();
                    remaining = list.remaining();
                    if(done < len && !!$("#toggle-all").attr("checked")){
                        $("#toggle-all").removeAttr("checked");
                    }else if(done == len){
                        $("#toggle-all").attr("checked",true);
                    }
                    this.footer.html(this.stateTemplate({
                        done: done,
                        remaining:remaining
                    }));
                }else{
                    this.main.hide();
                    this.footer.hide();
                    this.footer.html("");
                }
            },
            events:{
                "keyup #new-todo":function(e){
                    if(e.which=="13"){
                        e.preventDefault();
                        var view = new TodoView(Todos.create({title:$(this).val()}));
                        $("#todo-list").append(view.render());
                        $(this).val("");
                    }
                },
                "click #toggle-all":function(e){
                    Todos.doneAll(!!$(this).attr("checked"));
                },
                "click #clear-completed":function(e){
                    Todos.removeDone();
                    return false;
                }
            }
        };
        return  AppView;
    })($("#todoapp"), _.template($("#stats-template").html()),$("#main"),$("footer"));

    new AppView();


});

