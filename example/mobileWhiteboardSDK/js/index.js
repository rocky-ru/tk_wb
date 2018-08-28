window.onload = function () {
    var onPageFinshed = false ;
    var _onWindowResize = function () {
        var defalutFontSize = window.innerWidth / 15.6 ;  //5rem = defalutFontSize*'5px' ;
        var rootHtmls = document.getElementsByTagName('html') ;
        for(var i=0 ; i < rootHtmls.length ; i++){
            rootHtmls[i].style.fontSize =  defalutFontSize+ 'px';
        }
    };
    window.addEventListener("resize",function () { //窗口resize事件监听
        _onWindowResize();
        return false ;
    },false);
    _onWindowResize();

    var room = TK.MobileNativeRoom();  //房间实例化
    var tkWhiteBoardManagerInstance = new window.TKWhiteBoardManager(); //实例化白板管理器

    var parentNode = document.body; //挂载白板的节点
    var configration = {
        //rootBackgroundColor: '#cccccc',  //整个白板界面的背景颜色 ,默认 transparent
        isMobile:true ,  //是否是移动端
        isLoadAudioPlayer:false ,  //是否加载音频播放器
        isLoadVideoPlayer:false ,  //是否加载视频播放器
    };  //配置项
    var _receiveActionCommand = function (action, cmd) {
        if(typeof room.sendActionCommand === 'function'){
            room.sendActionCommand( action, cmd ); //指令转发给移动端原生程序
        }
    }; //接受白板的动作通知指令
    tkWhiteBoardManagerInstance.createMainWhiteboard(parentNode, configration, _receiveActionCommand);

    room.addEventListener('room-receiveActionCommand' , function ( receiveActionCommandData ) {
        if(!onPageFinshed){
            return ;
        }
        var action = receiveActionCommandData.message.action ;
        var cmd = receiveActionCommandData.message.cmd ;
        switch ( action ){
            case 'whiteboardSDK_changeWhiteBoardConfigration':
                tkWhiteBoardManagerInstance.changeWhiteBoardConfigration(cmd.updateConfiguration) ;
                break ;
            case 'whiteboardSDK_useWhiteboardTool':
                tkWhiteBoardManagerInstance.useWhiteboardTool(cmd.toolKey) ;
                break ;
            case 'whiteboardSDK_addPage':
                tkWhiteBoardManagerInstance.addPage() ;
                break ;
            case 'whiteboardSDK_nextPage':
                tkWhiteBoardManagerInstance.nextPage() ;
                break ;
            case 'whiteboardSDK_prevPage':
                tkWhiteBoardManagerInstance.prevPage() ;
                break ;
            case 'whiteboardSDK_skipPage':
                tkWhiteBoardManagerInstance.skipPage(cmd.toPage) ;
                break ;
            case 'whiteboardSDK_nextStep':
                tkWhiteBoardManagerInstance.nextStep() ;
                break ;
            case 'whiteboardSDK_prevStep':
                tkWhiteBoardManagerInstance.prevStep() ;
                break ;
            case 'whiteboardSDK_enlargeWhiteboard':
                tkWhiteBoardManagerInstance.enlargeWhiteboard() ;
                break ;
            case 'whiteboardSDK_narrowWhiteboard':
                tkWhiteBoardManagerInstance.narrowWhiteboard() ;
                break ;
            case 'whiteboardSDK_clear':
                tkWhiteBoardManagerInstance.clear() ;
                break ;
            case 'whiteboardSDK_undo':
                tkWhiteBoardManagerInstance.undo() ;
                break ;
            case 'whiteboardSDK_redo':
                tkWhiteBoardManagerInstance.redo() ;
                break ;
            case 'whiteboardSDK_fullScreen':
                tkWhiteBoardManagerInstance.fullScreen() ;
                break ;
            case 'whiteboardSDK_exitFullScreen':
                tkWhiteBoardManagerInstance.exitFullScreen() ;
                break ;
            case 'whiteboardSDK_updateWhiteboardSize':
                tkWhiteBoardManagerInstance.updateWhiteboardSize() ;
                break ;
            case 'whiteboardSDK_resetWhiteboardData':
                tkWhiteBoardManagerInstance.resetWhiteboardData() ;
                break ;
            case 'whiteboardSDK_resetPureWhiteboardTotalPage':
                tkWhiteBoardManagerInstance.resetPureWhiteboardTotalPage() ;
                break ;
            case 'whiteboardSDK_changeDynamicPptVolume':
                tkWhiteBoardManagerInstance.changeDynamicPptVolume(cmd.volume) ;
                break ;
            case 'whiteboardSDK_openDocumentRemark':
                tkWhiteBoardManagerInstance.openDocumentRemark() ;
                break ;
            case 'whiteboardSDK_closeDocumentRemark':
                tkWhiteBoardManagerInstance.closeDocumentRemark() ;
                break ;
        }
    });

    onPageFinshed = true ;
    room.onPageFinished();
};