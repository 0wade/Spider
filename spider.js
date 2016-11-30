// 引入 superagent、cheerio
var superagent= require("superagent");
var cheerio=require("cheerio");
var fs = require('fs');
var mkdirp = require('mkdirp');
var async=require('async');
var keyValue={
	url:'https://www.zhihu.com/question/35242408',//知乎的文章地址
	dir:'./'+35242408 //保存目录
}
var photos=[];
var download = function(url,dir, filename){
    superagent.get(url).on('error',function(error){
    	console.log(error);
        return;
    }).on('response',function(response){
    	console.log('正在下载'+url);
    }).pipe(fs.createWriteStream(dir + "/" + filename)).on('error',function(error){
    	console.log(error);return;
    }).on('close',function(fd){
    	console.log('下载完成'+filename);      
    });
};
var more={
    method:'POST',
    url:'https://www.zhihu.com/node/QuestionAnswerListV2',
    form:{method:'next',params:JSON.stringify({"url_token":keyValue.url.split('/')[4],"pagesize":10,"offset":10})},
    jar:false,
    headers: {
        "User-Agent":"Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Safari/537.36",
        'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',
    }   
}
//下载方法
var download = function(url, filename,callback){
    superagent(url).on('error',function(error){
        console.log(error);return;
    }).on('response',function(response){
        // console.log('正在下载'+url);
    }).pipe(fs.createWriteStream(keyValue.dir + "/" + filename)).on('error',function(error){
        console.log(error);return;
    }).on('close',function(){
        console.log('下载完成'+filename);
        callback(null);
        return;
    });
};

//创建目录
mkdirp(keyValue.dir, function(err) {
    if(err){
        console.log(err);
    }
});

function getFollower(){
        superagent.get(keyValue.url).set(more.headers).end(function(err,response){
        if (err) {
            console.log(err);
        } else {
            var $ = cheerio.load(response.text);
            // 此处，同样利用 F12 开发者工具，分析页面 Dom 结构，利用 cheerio 模块匹配元素
            var array = $('.origin_image');
            if (array && array.length > 0) {
                array.each(function () {
                    var src = $(this).attr('src');
                    if(src.indexOf('whitedot.jpg')==-1&&photos.indexOf(src)==-1){
                        if (src.indexOf('_b.jpg')!=-1) {
                            photos.push(src);
                        }
                    }else{
                        if(!$(this).attr('data-actualsrc')){
                            return;
                        }
                        if ($(this).attr('data-actualsrc').indexOf('_b.jpg')!=-1&&photos.indexOf($(this).attr('data-actualsrc'))==-1) {
                            src=$(this).attr('data-actualsrc');
                            photos.push(src);
                        }
                    }
                });
            }

        }
    });
}
function QuestionAnswerListV2(){
    superagent.post(more.url).set(more.headers).send(more.form).end(function(error,response){
        var getPhoto=function(msg){
            msg.forEach(function(current,index){
                var $=cheerio.load(msg[index]);
                $('img.origin_image').each(function() {
                    var src = $(this).attr('src');
                    if(src.indexOf('whitedot.jpg')==-1&&photos.indexOf(src)==-1){
                        if (src.indexOf('_b.jpg')!=-1) {
                            photos.push(src);               
                        }   
                    }else{
                        if ($(this).attr('data-actualsrc')&&$(this).attr('data-actualsrc').indexOf('_b.jpg')!=-1&&photos.indexOf($(this).attr('data-actualsrc'))==-1) {
                            src=$(this).attr('data-actualsrc');
                            photos.push(src);
                        }            
                    }    
                });                 
            });         
        };
        if (!error&&response.status===200) {
            var len=photos.length+1;
            console.log('正在请求'+len+'张图片');          
            var msg=JSON.parse(response.text).msg;
            getPhoto(msg);          
            if (msg.length==10) {
                var params=JSON.parse(more.form.params);
                params.offset+=10;
                more.form={method:'next',params:JSON.stringify(params)};
                setTimeout(function(){
                    QuestionAnswerListV2();
                },100);
            }else{
                async.mapLimit(photos, 10,function(photo,callback){                 
                    download(photo,photo.split('/')[3],callback);
                },function(err,results){ 
                    if(err){
                        console.log(err);
                    }else{
                        console.log("全部已下载完毕!");                       
                    }
                }); 
            }
        }
    });     
}
getFollower();
QuestionAnswerListV2();
