function getParams(key) {        //获取参数
    var urlAdd = decodeURIComponent(window.location.href);
    // var urlAdd = decodeURI(window.location.href);
    var urlIndex = urlAdd.indexOf("?");
    var urlSearch = urlAdd.substring(urlIndex + 1);
    var reg = new RegExp("(^|&)" + key + "=([^&]*)(&|$)", "i");   //reg表示匹配出:$+url传参数名字=值+$,并且$可以不存在，这样会返回一个数组
    var arr = urlSearch.match(reg);
    if (arr != null) {
        return arr[2];
    } else {
        return "";
    }
}

var roomOptios = {
    autoSubscribeAV: !muteSubscribeAV   //是否自动订阅音视频 , 如果为true则订阅过程中会接收服务器的音视频数据,否则不接收服务器音视频数据,只有调用playStream才会取服务器的相关音视频数据 , 默认为true
};
var filelist = {}; //文件列表
var room = TK.Room(roomOptios);  //房间
var isOnlyAudioRoom = false ; //是否是纯音频房间
var tkWhiteBoardManagerInstance = undefined;  //白板管理器实例
var documentFileid = 0;  //文档文件id
var mediaShareFileid = undefined ;  //媒体文件id
var muteSubscribeAV = getParams('muteSubscribeAV') === 'true';
// var muteSubscribeAV =  true;
var isDebugLog = getParams('debug') === 'true'; //是否是debug级别日志
   // var hostname = "global.talk-cloud.neiwang" ;
 var hostname = "demo.talk-cloud.net";
// var hostname = "global.talk-cloud.net" ;

//用户昵称
var name = 'tk_sdk_name_' + new Date().toLocaleString();

//获取教室编号
var mid = getParams('mid');
if (hostname === 'global.talk-cloud.net') {
    mid = '426091174';  //公网
} else if (hostname === 'demo.talk-cloud.net') {
    mid = '2139056258'; //demo
} else if (hostname === 'global.talk-cloud.neiwang') {
    mid = '1649794955';  //内网
}

room.init('82AUScqguvqXzhUh');
room.setLogIsDebug(isDebugLog);

//侦听房间连接事件
room.addEventListener("room-connected", function (roomEvent) {
    L.Logger.debug('room-connected', roomEvent);
    var idArr = ['joinRoom'];
    disableClick(idArr, true);
});


//侦听离开房间事件
room.addEventListener('room-leaveroom', function (roomEvent) {
    L.Logger.debug('room-leaveroom', roomEvent);
    var idArr = ['joinRoom'];
    disableClick(idArr, false);
    document.getElementById('changeDocument').innerHTML = '' ;
    document.getElementById('changeMediaDocument').innerHTML = '' ;
});

//侦听文件列表事件
room.addEventListener("room-files", function(roomEvent) {
    L.Logger.debug('room-files', roomEvent);
    var fileArray = roomEvent.message ;
    document.getElementById('changeDocument').innerHTML = '' ;
    document.getElementById('changeMediaDocument').innerHTML = '' ;

    var whiteboardOption = document.createElement('option');
    whiteboardOption.value = 0 ;
    whiteboardOption.innerHTML = '白板' ;
    if( documentFileid == 0 ){
        whiteboardOption.selected = true ;
    }
    document.getElementById('changeDocument').appendChild( whiteboardOption ); //此处需要将纯白板加入文档列表中，纯白板的fileid必须是0

    var mediaOption = document.createElement('option');
    mediaOption.value = '' ;
    mediaOption.innerHTML = '请选择媒体文件进行共享' ;
    document.getElementById('changeMediaDocument').appendChild( mediaOption );

    for(var i= 0 ; i<fileArray.length ; i++){
        var fileInfo = fileArray[i];
        filelist[fileInfo.fileid] = fileInfo ;
        var option = document.createElement('option');
        option.value = fileInfo.fileid ;
        option.innerHTML = fileInfo.filename ;
        option.setAttribute('data-filetype' , fileInfo.filetype);
        if(fileInfo.filetype === 'mp4' || fileInfo.filetype === 'mp3'){
            if( isOnlyAudioRoom && fileInfo.filetype === 'mp4' ){
                option.disabled = true ;
            }
            document.getElementById('changeMediaDocument').appendChild( option );
        }else{
            if( documentFileid == fileInfo.fileid ){
                option.selected = true ;
            }
            document.getElementById('changeDocument').appendChild( option );
        }
    }
});

/*纯音频房间的事件监听*/
room.addEventListener("room-onlyAudioRoom", function(roomEvent) {
    L.Logger.debug('room-onlyAudioRoom', roomEvent);
    isOnlyAudioRoom = roomEvent.message.isOnlyAudioRoom ;
    var options = document.getElementById('changeMediaDocument').getElementsByTagName('option');
    for (var i = 0; i < options.length; i++) {
        var option = options[i];
        if( isOnlyAudioRoom ){
            if( option.getAttribute('data-filetype') === 'mp4' ){
                option.disabled = true ;
            }
        }else{
            option.disabled = false ;
        }
    }
    if( isOnlyAudioRoom ){
        document.getElementById('changeMediaDocumentOnlyAudioRoomText').innerHTML = '(纯音频房间只能播放音频文件)';
    }else{
        document.getElementById('changeMediaDocumentOnlyAudioRoomText').innerHTML = '';
    }
});

function leaveRoomClick() {
    room.leaveroom();
}

function joinRoomClick() {
    console.error(hostname , 443 , name , undefined , {serial:mid,password:''})
    room.joinroom(hostname , 443 , name , undefined , {serial:mid,password:''});
}
function disableClick(idArr, isDisable) {
    var btnEle = document.getElementById('sdkBtnBox').querySelectorAll('input');
    for (var i = 0; i < btnEle.length; i++) {
        var value = btnEle[i];
        if (idArr.indexOf(value.id) >= 0) {
            value.disabled = isDisable;
        } else {
            value.disabled = !isDisable;
        }
    }
};

function changeDocument(fileid) {
    if (tkWhiteBoardManagerInstance && fileid !== '' ) {
        tkWhiteBoardManagerInstance.changeDocument(fileid, 1);
    }
}

function prevPage() {
    if (tkWhiteBoardManagerInstance) {
        tkWhiteBoardManagerInstance.prevPage();
    }
}

function nextPage() {
    if (tkWhiteBoardManagerInstance) {
        tkWhiteBoardManagerInstance.nextPage();
    }
}

function prevStep() {
    if (tkWhiteBoardManagerInstance) {
        tkWhiteBoardManagerInstance.prevStep();
    }
}

function nextStep() {
    if (tkWhiteBoardManagerInstance) {
        tkWhiteBoardManagerInstance.nextStep();
    }
}

function addPage() {
    if (tkWhiteBoardManagerInstance) {
        tkWhiteBoardManagerInstance.addPage();
    }
};

function skipPage(tatget) {
    if (tkWhiteBoardManagerInstance) {
        var value = tatget.value;
        tkWhiteBoardManagerInstance.skipPage(Number(value));
    }
}

function enlargeWhiteboard() {
    if (tkWhiteBoardManagerInstance) {
        tkWhiteBoardManagerInstance.enlargeWhiteboard();
    }
}

function narrowWhiteboard() {
    if (tkWhiteBoardManagerInstance) {
        tkWhiteBoardManagerInstance.narrowWhiteboard();
    }
}

function actionClear() {
    if (tkWhiteBoardManagerInstance) {
        tkWhiteBoardManagerInstance.clear();
    }
}

function actionUndo() {
    if (tkWhiteBoardManagerInstance) {
        tkWhiteBoardManagerInstance.undo();
    }
}

function actionRedo() {
    if (tkWhiteBoardManagerInstance) {
        tkWhiteBoardManagerInstance.redo();
    }
}


function selectWhiteboardTool(tatget) {
    if (tkWhiteBoardManagerInstance) {
        var toolKey = tatget.value;
        /*toolKey有：
         tool_mouse:鼠标
         tool_laser:激光笔
         tool_pencil:画笔
         tool_highlighter:荧光笔
         tool_line:直线
         tool_arrow:箭头
         tool_eraser:橡皮
         tool_text:文字
         tool_ellipse:实心椭圆
         tool_ellipse_empty:空心椭圆
         tool_rectangle:实心矩形
         tool_rectangle_empty:空心矩形
         */
        tkWhiteBoardManagerInstance.useWhiteboardTool(toolKey);
    }
}


function changeWhiteBoardConfigration(key, value) {
    if (tkWhiteBoardManagerInstance) {
        var updateConfigration = {};
        updateConfigration[key] = value;
        tkWhiteBoardManagerInstance.changeWhiteBoardConfigration(updateConfigration);
    }
}

function initWhiteboard() {
    if (window.TKWhiteBoardManager && room && room.registerRoomWhiteBoardDelegate) {
        tkWhiteBoardManagerInstance = new window.TKWhiteBoardManager();
        room.registerRoomWhiteBoardDelegate(tkWhiteBoardManagerInstance);
        var parentNode = document.getElementById('whiteboardArea'); //挂载白板的节点
        var configration = {
            rootBackgroundColor: '#cccccc',  //整个白板界面的背景颜色 ,默认 transparent
            languageType:document.getElementById('languageType').value , //语言类型，默认ch ,  languageType的值有 ch / tw / en  , ch:简体中文，tw:繁体中文 ， en:英文
        };  //配置项
        var _receiveActionCommand = function (action, cmd) {
            L.Logger.info('receive whiteboard sdk action command（action,cmd）:', action, cmd);
            if (action === 'viewStateUpdate') {
                for (var key in cmd.viewState) {
                    switch (key) {
                        case 'documentType': //文件类型：generalDocument（普通文件）、dynamicPPT（动态ppt）、h5Document(h5课件)
                            break;
                        case 'fileid':
                            documentFileid = cmd.viewState[key];
                            var options = document.getElementById('changeDocument').getElementsByTagName('option');
                            for (var i = 0; i < options.length; i++) {
                                var option = options[i];
                                option.selected = (option.value == documentFileid);
                            }
                            break;
                        case 'tool':
                            document.getElementById('tool_whiteboardToolSelect').innerHTML = '';
                            var toolTextMap = {
                                tool_mouse: '鼠标',
                                tool_laser: '激光笔',
                                tool_pencil: '画笔',
                                tool_highlighter: '荧光笔',
                                tool_line: '直线',
                                tool_arrow: '箭头',
                                tool_eraser: '橡皮',
                                tool_text: '文字',
                                tool_ellipse: '实心椭圆',
                                tool_ellipse_empty: '空心椭圆',
                                tool_rectangle: '实心矩形',
                                tool_rectangle_empty: '空心矩形',
                            };
                            for (var toolKey in cmd.viewState[key]) {
                                var option = document.createElement('option');
                                option.value = toolKey;
                                option.innerHTML = toolKey + '(' + toolTextMap[toolKey] + '工具)';
                                if (cmd.viewState[key][toolKey].isUse) {
                                    option.selected = true;
                                }
                                if( cmd.viewState[key][toolKey].disabled ){
                                    option.disabled = true;
                                }
                                document.getElementById('tool_whiteboardToolSelect').appendChild(option);
                            }
                            break;
                        case 'action':
                            document.getElementById('action_actionClear').disabled = cmd.viewState[key].action_clear.disabled;
                            document.getElementById('action_actionUndo').disabled = cmd.viewState[key].action_undo.disabled;
                            document.getElementById('action_actionRedo').disabled = cmd.viewState[key].action_redo.disabled;
                            break;
                        case 'zoom':
                            document.getElementById('zoom_enlargeWhiteboard').disabled = cmd.viewState[key].zoom_big.disabled;
                            document.getElementById('zoom_narrowWhiteboard').disabled = cmd.viewState[key].zoom_small.disabled;
                            break;
                        case 'page':
                            document.getElementById('page_prevPage').disabled = cmd.viewState[key].prevPage.disabled;
                            document.getElementById('page_nextPage').disabled = cmd.viewState[key].nextPage.disabled;
                            document.getElementById('page_prevStep').disabled = cmd.viewState[key].prevStep.disabled;
                            document.getElementById('page_nextStep').disabled = cmd.viewState[key].nextStep.disabled;
                            document.getElementById('page_addPage').disabled = cmd.viewState[key].addPage.disabled;
                            document.getElementById('page_currentPage').disabled = cmd.viewState[key].skipPage.disabled;
                            document.getElementById('page_totalPage').innerHTML = cmd.viewState[key].totalPage;
                            document.getElementById('page_currentPage').innerHTML = '';
                            for (var i = 1; i <= cmd.viewState[key].totalPage; i++) {
                                var option = document.createElement('option');
                                option.value = i;
                                option.innerHTML = i;
                                if (i === cmd.viewState[key].currentPage) {
                                    option.selected = true;
                                }
                                document.getElementById('page_currentPage').appendChild(option);
                            }
                            break;
                        case 'other':
                            var otherViewState = cmd.viewState[key] ;
                            document.getElementById('configuration_primaryColor').value = otherViewState.primaryColor ;
                            document.getElementById('configuration_backgroundColor').value = otherViewState.backgroundColor ;
                            document.getElementById('configuration_pencilWidth').value = otherViewState.pencilWidth ;
                            document.getElementById('configuration_shapeWidth').value = otherViewState.shapeWidth ;
                            document.getElementById('configuration_eraserWidth').value = otherViewState.eraserWidth ;
                            document.getElementById('configuration_fontSize').value = otherViewState.fontSize ;
                            document.getElementById('configuration_fontFamily').value = otherViewState.fontFamily ;
                            break;
                    }

                }
            }else if( action === 'mediaPlayerNotice' ){
                var type = cmd.type ;
                switch ( type ){
                    case 'start':
                        if( !cmd.isDynamicPptVideo ){
                            mediaShareFileid = cmd.fileid ;
                        }
                        var options = document.getElementById('changeMediaDocument').getElementsByTagName('option');
                        options[0].selected = true ;
                        for (var i = 0; i < options.length; i++) {
                            var option = options[i];
                            option.selected = (option.value == mediaShareFileid);
                        }
                        break;
                    case 'startShareMediaFail':
                    case 'subscribeShareMediaFail':
                    case 'end':
                        mediaShareFileid = undefined ;
                        var options = document.getElementById('changeMediaDocument').getElementsByTagName('option');
                        options[0].selected = true ;
                        break;
                }
            }
        }; //接受白板的动作通知指令
        tkWhiteBoardManagerInstance.createMainWhiteboard(parentNode, configration, _receiveActionCommand);
    } else {
        document.getElementById('whiteboardAreaTotalBox').style.display = 'none';
    }
}

window.onload = function () {
    var idArr = ['joinRoom'];
    disableClick(idArr, false);
    initWhiteboard();
};