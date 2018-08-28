/*sdk白板的管理类
 * @module TKWhiteBoardManager
 * @description  sdk与白板的通信管理类
 * @author 邱广生
 * @date 2018-04-18
 */
'use strict';
import Global from './utils/Global';
import Constant from './utils/Constant';
import Utils from './utils/Utils';
import Configuration from './utils/Configuration';
import WhiteboardIntermediateLayerInstance from './intermediateLayer/WhiteboardIntermediateLayer';
import WhiteboardView from './view/containers/WhiteboardView';
import TalkAudioPlayer from './view/containers/AudioPlayer';
import TalkVideoPlayer from './view/containers/VideoPlayer';
import TalkDocumentToolbar from  './view/containers/DocumentToolbar';
import TalkWhiteboardToolbar from  './view/containers/WhiteboardToolbar';
import TalkDocumentRemark from  './view/containers/DocumentRemark';

class TKWhiteBoardManagerInner{
    /*构造器*/
    constructor(room , sdkReceiveActionCommand, isInner){
        this.className = 'TKWhiteBoardManagerInner' ; //类的名字
        this.isInner = isInner;
        this.room = room ;
        this.sdkReceiveActionCommand = sdkReceiveActionCommand ;
        this.whiteboardViewMap = new Map() ;
        this.awitWhiteboardConfigrationMap = new Map() ;
        this.randomCreateExtendWhiteboardNumber = 0 ;
        this.audioPlayerView = undefined ; //音频播放器
        this.videoPlayerView = undefined ; //视频播放器
        this.documentRemarkView = undefined ; //文档备注视图
        this.documentToolbarView = undefined ; //文档工具条
        this.whiteboardToolbarViewList = {} ; //文档标注工具条列表
        this.listernerBackupid = new Date().getTime()+'_'+Math.random() ;
        this.pureWhiteboardFileinfo = {
            "fileid": 0 ,
            "companyid": '' ,
            "filename": 'whiteboard' ,
            "uploaduserid": '' ,
            "uploadusername":'' ,
            "downloadpath": '' ,
            "swfpath": '',
            "filetype": 'whiteboard' ,
            "pagenum": 1 ,
            "dynamicppt": 0 ,
            "filecategory": 0 ,
            "fileprop": 0 , //0：普通文档 ， 1-2：动态ppt(1-旧版，2-新版) ， 3：h5文档
        };
        this._registerEvent();
        this._addRoomEvent();
    };

    /*获取版本号*/
    getVersion(){
        return Constant.WHITEBOARD_SDK_VERSION;
    }

    /*创建主白板
    * @params parentNode:白板容器节点 ， Node
    * @params configration:白板配置项 ， Json
    * @params receiveActionCommand:接收白板通知消息函数 ， Function
    * */
    createMainWhiteboard( parentNode = document.body  , configration = {} , receiveActionCommand ){
        if(  typeof parentNode === 'string'){
            let parentNodeStr = parentNode ;
            parentNode = document.getElementById( parentNodeStr );
            if(!parentNode){
                L.Logger.warning('The node id cannot be found by node id, and createMainWhiteboard method cannot be performed , element id is '+parentNodeStr+'.');
                return ;
            }
        }
        let instanceId = 'default' ;
		L.Logger.debug('[whiteboarrd-sdk]createMainWhiteboard  parentNode and configration and receiveActionCommand:',parentNode , configration , receiveActionCommand);
        this._createWhiteboard( parentNode , instanceId , configration , (...args) => {
            if( this.documentToolbarView && this.documentToolbarView.receiveActionCommand ){
                this.documentToolbarView.receiveActionCommand(...args);
            }
            if( this.documentRemarkView && this.documentRemarkView.receiveActionCommand ){
                this.documentRemarkView.receiveActionCommand(...args);
            }
            if(typeof receiveActionCommand === 'function'){
                if (this.isInner) {
                    receiveActionCommand(...args);
                }else {
                    let action = args[0];
                    if (action === 'viewStateUpdate' || action === 'mediaPlayerNotice') {
                        receiveActionCommand(...args);
                    }
                }
            }
        } );
        let whiteboardView = this.whiteboardViewMap.get( instanceId ) ;
        if( whiteboardView && whiteboardView.getConfigration().isLoadDocumentToolBar ){
            let documentToolBarParentNode = whiteboardView.getConfigration().documentToolBarConfig.parentNode ||  whiteboardView.getWhiteboardRootElement();
            this.createDocumentToolBar( documentToolBarParentNode , whiteboardView.getConfigration().documentToolBarConfig );
        }
        if( whiteboardView && whiteboardView.getConfigration().isLoadDocumentRemark ){
            let documentRemarkParentNode = whiteboardView.getConfigration().documentRemarkConfig.parentNode ||  whiteboardView.getWhiteboardRootElement();
            this.createDocumentRemark( documentRemarkParentNode , whiteboardView.getConfigration().documentRemarkConfig );
        }
        if( whiteboardView && whiteboardView.getConfigration().isLoadAudioPlayer ){
            let audioPlayerParentNode = whiteboardView.getConfigration().audioPlayerConfig.parentNode ||  whiteboardView.getWhiteboardRootElement();
            this.createAudioPlayer( audioPlayerParentNode , whiteboardView.getConfigration().audioPlayerConfig );
        }
        if( whiteboardView && whiteboardView.getConfigration().isLoadVideoPlayer ){
            let videoPlayerParentNode = whiteboardView.getConfigration().videoPlayerConfig.parentNode ||  whiteboardView.getWhiteboardRootElement();
            this.createVideoPlayer( videoPlayerParentNode , whiteboardView.getConfigration().videoPlayerConfig );
        }
    };

    /*创建扩展白板
     * @params parentNode:白板容器节点 ， Node
     * @params instanceId:白板实例id  , String
     * @params configration:白板配置项 ， Json
     * @params receiveActionCommand:接收白板通知消息函数 ， Function
    */
    createExtendWhiteboard( parentNode = document.body ,  instanceId = undefined ,  configration = {} , receiveActionCommand ){
		L.Logger.debug('[whiteboarrd-sdk]createExtendWhiteboard  parentNode  instanceId  configration and receiveActionCommand:', parentNode , instanceId , configration , receiveActionCommand);
        if( instanceId !== undefined && instanceId !== null ){
            if(  typeof parentNode === 'string'){
                let parentNodeStr = parentNode ;
                parentNode = document.getElementById( parentNodeStr );
                if(!parentNode){
                    L.Logger.warning('The node id cannot be found by node id, and createExtendWhiteboard method cannot be performed , element id is '+parentNodeStr+'.');
                    return ;
                }
            }
            if(!instanceId){
                this.randomCreateExtendWhiteboardNumber++ ;
                instanceId = 'randomWhiteboard'+this.randomCreateExtendWhiteboardNumber ;
            }
            this._createWhiteboard( parentNode , instanceId , configration , receiveActionCommand );
        }
    };

    /*销毁主白板*/
    destroyMainWhiteboard(){
		L.Logger.debug('[whiteboarrd-sdk]destroyMainWhiteboard');
        let instanceId = 'default' ;
        this._destroyWhiteboard(instanceId);
    };

    /*销毁扩展白板
     * @params instanceId:白板实例id  , String
    * */
    destroyExtendWhiteboard(instanceId){
		L.Logger.debug('[whiteboarrd-sdk]destroyExtendWhiteboard  instanceId:',instanceId);
        if( instanceId !== undefined && instanceId !== null ){
            this._destroyWhiteboard(instanceId);
        }
    };

    /*改变显示的文件
     * @params fileid:文件id , Int
     * @params toPage:跳到的页数 , Int */
    changeDocument( fileid , toPage = 1 ){
        if(TK.SDKTYPE === 'mobile'){
            L.Logger.error('changeDocument method is not allowed in the mobile environment!');
            return ;
        }
        if(fileid === undefined || fileid === null){
            L.Logger.error('changeDocument method parameter error: fileid can\'t be empty! ');
            return ;
        }
        if( this.room ){
            if( this.whiteboardViewMap.has('default') ){
                let whiteboardView = this.whiteboardViewMap.get('default') ;
                let fileinfo = undefined ;
                if(fileid == 0){
                    fileinfo = this.pureWhiteboardFileinfo ;
                }else{
                    let filelist = this.room.getFileList();
                    for( let file of filelist ){
                        if( file.fileid ==  fileid ){
                            fileinfo = file ;
                            break ;
                        }
                    }
                }
                if( fileinfo ){
                    if( /(mp3|mp4|webm)/g.test( fileinfo.filetype ) ){
                        let swfpath = fileinfo.swfpath;
                        let index = swfpath.lastIndexOf(".") ;
                        let imgType = swfpath.substring(index);
                        let fileUrl = swfpath.replace(imgType,"-1"+imgType) ;
                        let url =  Global.nowUseDocAddress  + fileUrl ,
                            isVideo = /(mp4|webm)/g.test( fileinfo.filetype ) ,
                            toID = whiteboardView.getConfigration().mediaShareToID ,
                            attrs = {
                                source:'mediaFileList' ,
                                filename:fileinfo.filename ,
                                fileid:fileinfo.fileid  ,
                                pauseWhenOver:isVideo && whiteboardView.getConfigration().mediaSharePauseWhenOver
                            } ;
                        this.startShareMedia( url , isVideo , toID , attrs );
                    }else{
                        let fileprop = Number( fileinfo.fileprop );
                        let isDynamicPPT = fileprop === 1 || fileprop === 2 ;
                        let isH5Document = fileprop === 3 ;
                        let isGeneralFile = !isDynamicPPT && !isH5Document ;
                        if( isDynamicPPT || isH5Document || isGeneralFile ){
                            if( isGeneralFile && toPage > fileinfo.pagenum ){
                                toPage = fileinfo.pagenum ;
                            }
                            if(toPage < 1){
                                toPage = 1 ;
                            }
                            let pubmsgData = {
                                name: 'ShowPage' ,
                                id: 'DocumentFilePage_ShowPage' ,
                                toID: '__all' ,
                                data: {
                                    isGeneralFile: isGeneralFile ,
                                    isMedia:false ,
                                    isDynamicPPT:isDynamicPPT ,
                                    isH5Document: isH5Document  ,
                                    action: 'show' ,
                                    mediaType:'' ,
                                    filedata:{
                                        currpage:toPage ,
                                        pptslide: isDynamicPPT ? toPage : 1,
                                        pptstep:0,
                                        steptotal:0 ,
                                        fileid:fileinfo.fileid ,
                                        pagenum:fileinfo.pagenum ,
                                        filename:fileinfo.filename ,
                                        filetype:fileinfo.filetype ,
                                        isContentDocument:fileinfo.isContentDocument ,
                                        swfpath: (isDynamicPPT || isH5Document) ? fileinfo.downloadpath : fileinfo.swfpath
                                    }
                                },
                                save: true ,
                            };
                            this.receiveEventRoomPubmsg({ type:'room-pubmsg' , message: Object.deepAssign({} , pubmsgData)  });
                            if( whiteboardView.getConfigration().synchronization &&  whiteboardView.getConfigration().isConnectedRoom){
                                this.pubMsg( pubmsgData );
                            }
                        }else{
                            L.Logger.info('[sdk-whiteboard]changeDocument:you open file type is not support , filetype is '+fileinfo.filetype+' , fileid is '+fileid+' , toPage is '+toPage+'.');
                        }
                    }
                }else{
                    L.Logger.info('[sdk-whiteboard]changeDocument:you can\'t find the file by fileid , fileid is '+fileid+' , toPage is '+toPage+'.');
                }
            }
        }
    };

    /*改变白板相关配置
     * @params configration:需要更新的配置项 , Object
     * @params instanceId:白板实例id , String
     */
    changeWhiteBoardConfigration(configration , instanceId = 'default'){
        let commonWhiteBoardConfigration = {} ;
        for( let key in configration ){
            if( Configuration.commonWhiteboard.hasOwnProperty( key ) ){
                commonWhiteBoardConfigration[key] = configration[key] ;
                delete configration[key] ;
            }
        }
        if( Object.keys(commonWhiteBoardConfigration).length ){
            this.changeCommonWhiteBoardConfigration( commonWhiteBoardConfigration ) ;
        }
        if( !Object.keys(configration).length ){
            return ;
        }
        L.Logger.debug('[whiteboarrd-sdk]changeWhiteBoardConfigration  configration and instanceId:' , configration , instanceId);
        if( this.whiteboardViewMap.has(instanceId) ){
            if( this.awitWhiteboardConfigrationMap.has(instanceId) ){
                this.awitWhiteboardConfigrationMap.delete(instanceId);
            }
            this.whiteboardViewMap.get(instanceId).changeWhiteBoardConfigration(configration);
        }else{
            if( this.awitWhiteboardConfigrationMap.has(instanceId) ){
                Object.deepAssign( this.awitWhiteboardConfigrationMap.get(instanceId) , configration);
            }else{
                this.awitWhiteboardConfigrationMap.set( instanceId ,Object.deepAssign({} , Configuration.defaultWhiteboard , Configuration.commonWhiteboard , configration) ) ;
            }
        }
        if( configration.isLoadDocumentToolBar !== undefined && instanceId === 'default' ){
            let whiteboardView = this.whiteboardViewMap.get( instanceId ) ;
            if(configration.isLoadDocumentToolBar && !this.documentToolbarView ){
                if( whiteboardView ){
                    let documentToolBarParentNode = whiteboardView.getConfigration().documentToolBarConfig.parentNode ||  whiteboardView.getWhiteboardRootElement();
                    this.createDocumentToolBar( documentToolBarParentNode , whiteboardView.getConfigration().documentToolBarConfig );
                }
            }else if(!configration.isLoadDocumentToolBar && this.documentToolbarView && this.documentToolbarView.destroyView ){
                this.documentToolbarView.destroyView();
                this.documentToolbarView = undefined ;
            }
        }
        if( configration.isLoadDocumentRemark !== undefined && instanceId === 'default' ){
            let whiteboardView = this.whiteboardViewMap.get( instanceId ) ;
            if(configration.isLoadDocumentRemark && !this.documentRemarkView ){
                if( whiteboardView ){
                    let documentRemarkParentNode = whiteboardView.getConfigration().documentRemarkConfig.parentNode ||  whiteboardView.getWhiteboardRootElement();
                    this.createDocumentRemark( documentRemarkParentNode , whiteboardView.getConfigration().documentRemarkConfig );
                }
            }else if(!configration.isLoadDocumentRemark && this.documentRemarkView && this.documentRemarkView.destroyView ){
                this.documentRemarkView.destroyView();
                this.documentRemarkView = undefined ;
            }
        }

        if( configration.isLoadWhiteboardToolBar !== undefined ){
            let whiteboardView = this.whiteboardViewMap.get( instanceId ) ;
            if(configration.isLoadWhiteboardToolBar && !this.whiteboardToolbarViewList[instanceId] ){
                if( whiteboardView ){
                    let whiteboardToolBarParentNode = whiteboardView.getConfigration().whiteboardToolBarConfig.parentNode ||  whiteboardView.getWhiteboardRootElement();
                    this.createWhiteboardToolBar( whiteboardToolBarParentNode , whiteboardView.getConfigration().whiteboardToolBarConfig , instanceId );
                }
            }else if(!configration.isLoadWhiteboardToolBar && this.whiteboardToolbarViewList[instanceId] && this.whiteboardToolbarViewList[instanceId].destroyView ){
                this.whiteboardToolbarViewList[instanceId].destroyView();
                this.whiteboardToolbarViewList[instanceId] = undefined ;
                delete this.whiteboardToolbarViewList[instanceId] ;
            }
        }

        if( configration.isLoadAudioPlayer !== undefined && instanceId === 'default'){
            let whiteboardView = this.whiteboardViewMap.get( instanceId ) ;
            if(configration.isLoadAudioPlayer && !this.audioPlayerView ){
                if( whiteboardView ){
                    let audioPlayerParentNode = whiteboardView.getConfigration().audioPlayerConfig.parentNode ||  whiteboardView.getWhiteboardRootElement();
                    this.createAudioPlayer( audioPlayerParentNode , whiteboardView.getConfigration().audioPlayerConfig );
                }
            }else if(!configration.isLoadAudioPlayer && this.audioPlayerView && this.audioPlayerView.destroyView ){
                this.audioPlayerView.destroyView();
                this.audioPlayerView = undefined ;
            }
        }

        if( configration.isLoadVideoPlayer !== undefined && instanceId === 'default'){
            let whiteboardView = this.whiteboardViewMap.get( instanceId ) ;
            if(configration.isLoadVideoPlayer && !this.videoPlayerView ){
                if( whiteboardView ){
                    let videoPlayerParentNode = whiteboardView.getConfigration().videoPlayerConfig.parentNode ||  whiteboardView.getWhiteboardRootElement();
                    this.createVideoPlayer( videoPlayerParentNode , whiteboardView.getConfigration().videoPlayerConfig );
                }
            }else if(!configration.isLoadVideoPlayer && this.videoPlayerView && this.videoPlayerView.destroyView ){
                this.videoPlayerView.destroyView();
                this.videoPlayerView = undefined ;
            }
        }

        if( configration.languageType !== undefined ){
            if( instanceId === 'default' ){
                if( this.documentToolbarView ){
                    this.documentToolbarView.setProps({
                        languageType:configration.languageType
                    });
                }
                if( this.documentRemarkView ){
                    this.documentRemarkView.setProps({
                        languageType:configration.languageType
                    });
                }
            }
            if( this.whiteboardToolbarViewList[instanceId] ){
                this.whiteboardToolbarViewList[instanceId].setProps({
                    languageType:configration.languageType
                });
            }
        }
        if( configration.isMobile !== undefined ){
            if( instanceId === 'default' ){
                if( this.documentToolbarView ){
                    this.documentToolbarView.setProps({
                        isMobile:configration.isMobile
                    });
                }
                if( this.documentRemarkView ){
                    this.documentRemarkView.setProps({
                        isMobile:configration.isMobile
                    });
                }
            }
            if( this.whiteboardToolbarViewList[instanceId] ){
                this.whiteboardToolbarViewList[instanceId].setProps({
                    isMobile:configration.isMobile
                });
            }
        }

        if( configration.canRemark !== undefined ){
            if( instanceId === 'default' ){
                if( this.documentToolbarView ){
                    this.documentToolbarView.setProps({
                        canRemark:configration.canRemark
                    });
                }
                if( this.documentRemarkView ){
                    this.documentRemarkView.setProps({
                        canRemark:configration.canRemark
                    });
                }
            }
        }

        if( configration.whiteboardToolBarConfig  !== undefined ){
            if( this.whiteboardToolbarViewList[instanceId] ){
                if( configration.whiteboardToolBarConfig.hasOwnProperty( 'parentNode' ) && typeof this.whiteboardToolbarViewList[instanceId].changeParentNode === 'function' ){
                    let whiteboardView = this.whiteboardViewMap.get( instanceId ) ;
                    let parentNode = configration.whiteboardToolBarConfig.parentNode || ( whiteboardView ?  whiteboardView.getWhiteboardRootElement() : undefined );
                    if( typeof parentNode === 'string'){
                        let parentNodeStr = parentNode ;
                        parentNode = document.getElementById( parentNodeStr );
                        if(!parentNode){
                            L.Logger.warning('The node id cannot be found by node id, and  whiteboardToolBarConfig.parentNode cannot update config, element id is '+parentNodeStr+'.');
                            return ;
                        }
                    }
                    this.whiteboardToolbarViewList[instanceId].changeParentNode( parentNode );
                }
                for(let key in configration.whiteboardToolBarConfig ){
                    let value = configration.whiteboardToolBarConfig[key] ;
                    if( typeof value === 'object' ){
                        configration.whiteboardToolBarConfig[key] = Object.deepAssign({} , this.whiteboardToolbarViewList[instanceId].props[key] , value );
                    }
                }
                this.whiteboardToolbarViewList[instanceId].setProps( Object.deepAssign({} , configration.whiteboardToolBarConfig ) );
            }
        }

        if( configration.documentToolBarConfig  !== undefined ){
            if( instanceId === 'default' ){
                if( this.documentToolbarView ){
                    if( configration.documentToolBarConfig.hasOwnProperty( 'parentNode' ) && typeof this.documentToolbarView.changeParentNode === 'function' ){
                        let whiteboardView = this.whiteboardViewMap.get( instanceId ) ;
                        let parentNode = configration.documentToolBarConfig.parentNode || ( whiteboardView ?  whiteboardView.getWhiteboardRootElement() : undefined );
                        if( typeof parentNode === 'string'){
                            let parentNodeStr = parentNode ;
                            parentNode = document.getElementById( parentNodeStr );
                            if(!parentNode){
                                L.Logger.warning('The node id cannot be found by node id, and  documentToolBarConfig.parentNode cannot update config, element id is '+parentNodeStr+'.');
                                return ;
                            }
                        }
                        this.documentToolbarView.changeParentNode( parentNode );
                    }
                    for(let key in configration.documentToolBarConfig ){
                        let value = configration.documentToolBarConfig[key] ;
                        if( typeof value === 'object' ){
                            configration.documentToolBarConfig[key] = Object.deepAssign({} , this.documentToolbarView.props[key] , value );
                        }
                    }
                    this.documentToolbarView.setProps( Object.deepAssign({} , configration.documentToolBarConfig ) );
                }
            }
        }

        if( configration.documentRemarkConfig  !== undefined ){
            if( instanceId === 'default' ){
                if( this.documentRemarkView ){
                    if( configration.documentRemarkConfig.hasOwnProperty( 'parentNode' ) && typeof this.documentRemarkView.changeParentNode === 'function' ){
                        let whiteboardView = this.whiteboardViewMap.get( instanceId ) ;
                        let parentNode = configration.documentRemarkConfig.parentNode || ( whiteboardView ?  whiteboardView.getWhiteboardRootElement() : undefined );
                        if( typeof parentNode === 'string'){
                            let parentNodeStr = parentNode ;
                            parentNode = document.getElementById( parentNodeStr );
                            if(!parentNode){
                                L.Logger.warning('The node id cannot be found by node id, and  documentRemarkConfig.parentNode cannot update config, element id is '+parentNodeStr+'.');
                                return ;
                            }
                        }
                        this.documentRemarkView.changeParentNode( parentNode );
                    }
                    for(let key in configration.documentRemarkConfig ){
                        let value = configration.documentRemarkConfig[key] ;
                        if( typeof value === 'object' ){
                            configration.documentRemarkConfig[key] = Object.deepAssign({} , this.documentRemarkView.props[key] , value );
                        }
                    }
                    this.documentRemarkView.setProps( Object.deepAssign({} , configration.documentRemarkConfig ) );
                }
            }
        }

        if( configration.audioPlayerConfig  !== undefined ){
            if( this.audioPlayerView ){
                for(let key in configration.audioPlayerConfig ){
                    let value = configration.audioPlayerConfig[key] ;
                    if( typeof value === 'object' ){
                        configration.audioPlayerConfig[key] = Object.deepAssign({} , this.audioPlayerView.props[key] , value );
                    }
                }
                this.audioPlayerView.setProps( Object.deepAssign({} , configration.audioPlayerConfig ) );
            }
        }

        if( configration.videoPlayerConfig  !== undefined ){
            if( this.videoPlayerView ){
                for(let key in configration.videoPlayerConfig ){
                    let value = configration.videoPlayerConfig[key] ;
                    if( typeof value === 'object' ){
                        configration.videoPlayerConfig[key] = Object.deepAssign({} , this.videoPlayerView.props[key] , value );
                    }
                }
                this.videoPlayerView.setProps( Object.deepAssign({}  , configration.videoPlayerConfig ) );
            }
        }

    };


    /*改变所有白板的公有配置
    * @params <Object> commonConfigration 更新的公有配置项
    * */
    changeCommonWhiteBoardConfigration(commonConfigration){
        L.Logger.debug('[whiteboarrd-sdk]changeCommonWhiteBoardConfigration common configration:' , commonConfigration );
        let CopyObj = Object.deepAssign({},commonConfigration);
        if(typeof CopyObj.docAddress === 'object'){
            if(Global.docAddressKey === ''){
                Global.docAddressKey = commonConfigration.docAddress.hostname ;
            }
            CopyObj.docAddress = commonConfigration.docAddress.protocol  + '://'  + commonConfigration.docAddress.hostname + ':' + commonConfigration.docAddress.port ; // 将拷贝完毕之后的doc地址还原成字符串
            Global.protocol = CopyObj.docAddress.protocol;
            Global.port = CopyObj.docAddress.port;
        };
        if(typeof CopyObj.webAddress === 'object'){
            CopyObj.webAddress = commonConfigration.webAddress.protocol  + '://'  + commonConfigration.webAddress.hostname + ':' + commonConfigration.webAddress.port ; // 将拷贝完毕之后的web地址还原成字符串
        }
        Object.deepAssign( Configuration.commonWhiteboard , CopyObj) ;
        for( let awitWhiteboardConfigration of this.awitWhiteboardConfigrationMap.values() ){
            Object.deepAssign( awitWhiteboardConfigration , CopyObj);
        }

        if( commonConfigration.docAddress !== undefined || commonConfigration.backupDocAddressList !== undefined ){
            Global.docAddressList =  [commonConfigration.docAddress,...commonConfigration.backupDocAddressList,...Global.laterAddressList] ;
            if( !Global.hasGetDocAddressIndexByLocalStorage ){
                Global.nowUseDocAddress = Utils.getItem(Global.docAddressList,Global.docAddressKey)  || Configuration.commonWhiteboard.docAddress;
                this.getLocalStorageItem( 'tkDocAddressKey'  ,  (docAddressKey) => {
                    if(docAddressKey && docAddressKey !== undefined && typeof  docAddressKey === 'string' && docAddressKey !=='undefined'){
                        Global.docAddressKey =   docAddressKey ;
                        Global.nowUseDocAddress = Utils.getItem(Global.docAddressList,Global.docAddressKey) || Configuration.commonWhiteboard.docAddress;
                        Global.hasGetDocAddressIndexByLocalStorage = true ;
                    }else{
                        Global.nowUseDocAddress = Utils.getItem(Global.docAddressList,Global.docAddressKey) || Configuration.commonWhiteboard.docAddress;
                        Global.hasGetDocAddressIndexByLocalStorage = true ;
                    }
                });
            }else{
                Global.nowUseDocAddress = Utils.getItem(Global.docAddressList,Global.docAddressKey) || Configuration.commonWhiteboard.docAddress  ;
            }
        }

        for( let [instanceId , whiteboardView] of this.whiteboardViewMap ){
            if( this.awitWhiteboardConfigrationMap.has(instanceId) ){
                this.awitWhiteboardConfigrationMap.delete(instanceId);
            }
            whiteboardView.changeWhiteBoardConfigration(CopyObj);
        }

        for( let  whiteboardToolbarView  of Object.values( this.whiteboardToolbarViewList ) ){
            whiteboardToolbarView.setProps( Object.deepAssign({} , CopyObj ) ) ;
        }

        if( this.documentToolbarView ){
            this.documentToolbarView.setProps( Object.deepAssign({} , CopyObj ) );
        }

        if( this.documentRemarkView ){
            this.documentRemarkView.setProps( Object.deepAssign({} , CopyObj ) );
        }

        if( this.audioPlayerView ){
            this.audioPlayerView.setProps( Object.deepAssign({} , CopyObj ) );
        }

        if( this.videoPlayerView ){
            this.videoPlayerView.setProps( Object.deepAssign({} , CopyObj ) );
        }
    };

    /*使用标注工具
    * @params toolKey:工具的key，key值描述如下：
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
    * @params instanceId:白板实例id
    * */
    useWhiteboardTool( toolKey  , instanceId = 'default' ){
		L.Logger.debug('[whiteboarrd-sdk]useWhiteboardTool toolKey and instanceId:' , toolKey ,instanceId);
        if( this.whiteboardViewMap.has(instanceId) ){
            this.whiteboardViewMap.get(instanceId).useWhiteboardTool( toolKey );
        }
    }

    /*加页*/
    addPage( ){
        L.Logger.debug('[whiteboarrd-sdk]addPage ')
        let instanceId = 'default' ;
        if( this.whiteboardViewMap.has(instanceId) ){
            this.whiteboardViewMap.get(instanceId).addPage(  );
        }
    };

    /*下一页*/
    nextPage( ){
		L.Logger.debug('[whiteboarrd-sdk]nextPage ' )
        let instanceId = 'default' ;
        if( this.whiteboardViewMap.has(instanceId) ){
            this.whiteboardViewMap.get(instanceId).nextPage(  );
        }
    }

    /*上一页*/
    prevPage( ){
		L.Logger.debug('[whiteboarrd-sdk]prevPage ')
        let instanceId = 'default' ;
        if( this.whiteboardViewMap.has(instanceId) ){
            this.whiteboardViewMap.get(instanceId).prevPage(  );
        }
    }

    /*跳转到指定页
    * @params page:跳转到的页数，Int
    * */
    skipPage( page ){
		L.Logger.debug('[whiteboarrd-sdk]skipPage  page :' ,page)
        let instanceId = 'default' ;
        if( typeof page !== 'number' ){
            L.Logger.warning('skipPage page must is number!');
            return ;
        }
        if( this.whiteboardViewMap.has(instanceId) ){
            this.whiteboardViewMap.get(instanceId).skipPage( page );
        }
    }

    /*下一步，用于动态ppt*/
    nextStep(){
		L.Logger.debug('[whiteboarrd-sdk]nextStep ')
        let instanceId = 'default' ;
        if( this.whiteboardViewMap.has(instanceId) ){
            this.whiteboardViewMap.get(instanceId).nextStep(  );
        }
    }

    /*上一步，用于动态ppt*/
    prevStep( ){
		L.Logger.debug('[whiteboarrd-sdk]prevStep ' )
        let instanceId = 'default' ;
        if( this.whiteboardViewMap.has(instanceId) ){
            this.whiteboardViewMap.get(instanceId).prevStep(  );
        }
    }

    /*放大操作*/
    enlargeWhiteboard( instanceId = 'default' ){
		L.Logger.debug('[whiteboarrd-sdk]enlargeWhiteboard  instanceId:'  ,instanceId)
        let zoomKey = 'zoom_big';// zoom_big:放大白板
        this.executeZoomWhiteaord( zoomKey , instanceId);
    };

    /*缩小操作*/
    narrowWhiteboard( instanceId = 'default' ){
		L.Logger.debug('[whiteboarrd-sdk]narrowWhiteboard  instanceId:'  ,instanceId)
        let zoomKey = 'zoom_small';// zoom_big:放大白板
        this.executeZoomWhiteaord( zoomKey , instanceId);
    };

    /*清空当前页画笔操作*/
    clear( instanceId = 'default' ){
		L.Logger.debug('[whiteboarrd-sdk]clear  instanceId:'  ,instanceId)
        let actionKey = 'action_clear';// action_clear:清空白板画笔
        this.executeWhiteboardAction( actionKey , instanceId );
    }

    /*撤销画笔操作*/
    undo( instanceId = 'default' ){
		L.Logger.debug('[whiteboarrd-sdk]undo  instanceId:'  ,instanceId)
        let  actionKey = 'action_undo';// action_undo:撤销白板画笔
        this.executeWhiteboardAction( actionKey , instanceId );
    }

    /*恢复画笔操作*/
    redo( instanceId = 'default' ){
		L.Logger.debug('[whiteboarrd-sdk]redo  instanceId:'  ,instanceId)
        let  actionKey = 'action_redo';// action_redo:恢复白板画笔
        this.executeWhiteboardAction( actionKey , instanceId );
    }

    /*全屏功能*/
    fullScreen(){
		L.Logger.debug('[whiteboarrd-sdk]fullScreen ' );
        let instanceId = 'default' ;
        if( this.whiteboardViewMap.has(instanceId) && this.room ){
            let whiteboardView = this.whiteboardViewMap.get(instanceId) ;
            if( whiteboardView.getConfigration().isMobile ){ //移动端的全屏
                if( this.room.changeWebPageFullScreen ){
                    this.room.changeWebPageFullScreen(true);
                }
            }else{ //浏览器的全屏
                if( Utils.isFullScreenStatus() ){
                    Utils.exitFullscreen();
                }
                let fullScreenElement = whiteboardView.getWhiteboardRootElement() ;
                let { fullScreenElementId } =  whiteboardView.getConfigration().documentToolBarConfig ;
                if( fullScreenElementId ){
                    if( typeof  fullScreenElementId === 'string' ){
                        if( document.getElementById( fullScreenElementId ) ){
                            fullScreenElement = document.getElementById( fullScreenElementId ) ;
                        }
                    }else{
                        fullScreenElement = fullScreenElementId ;
                    }
                }
                Utils.launchFullscreen( fullScreenElement ) ;
            }
            // whiteboardView.changeFullScreenState( true );
        }
    }

    /*退出全屏功能*/
    exitFullScreen(){
		L.Logger.debug('[whiteboarrd-sdk]exitFullScreen ');
        let instanceId = 'default' ;
        if( this.whiteboardViewMap.has(instanceId) && this.room ){
            let whiteboardView = this.whiteboardViewMap.get(instanceId) ;
            if( whiteboardView.getConfigration().isMobile ){ //移动端的全屏
                if( this.room.changeWebPageFullScreen ){
                    this.room.changeWebPageFullScreen(false);
                }
            }else{ //浏览器的全屏
                Utils.exitFullscreen();
            }
            // whiteboardView.changeFullScreenState( false );
        }
    }

    /*更新白板大小
     * @params instanceId:白板实例id , String
    * */
    updateWhiteboardSize(instanceId  = 'default'){
		L.Logger.debug('[whiteboarrd-sdk]updateWhiteboardSize  instanceId:'  ,instanceId);
        if( this.whiteboardViewMap.has(instanceId) ){
            this.whiteboardViewMap.get(instanceId).resizeWhiteboardHandler();
        }
        if( instanceId  === 'default' && this.documentRemarkView &&  Utils.isFunction( this.documentRemarkView.resize ) ){
            this.documentRemarkView.resize();
        }
        if( instanceId  === 'default' && this.documentToolbarView &&  Utils.isFunction( this.documentToolbarView.resize ) ){
            this.documentToolbarView.resize();
        }
        if( this.whiteboardToolbarViewList[instanceId] &&  Utils.isFunction( this.whiteboardToolbarViewList[instanceId].resize ) ){
            this.whiteboardToolbarViewList[instanceId].resize();
        }
    };

    /*更新所有白板大小*/
    updateAllWhiteboardSize(){
		L.Logger.debug('[whiteboarrd-sdk]updateAllWhiteboardSize ');
        for( let instanceId of this.whiteboardViewMap.keys() ){
            this.updateWhiteboardSize( instanceId );
        }
    };

    /*重置指定白板的所有画笔数据
     * @params instanceId:白板实例id , 默认为'default', String
     * */
    resetWhiteboardData(instanceId = 'default'){
		L.Logger.debug('[whiteboarrd-sdk]resetWhiteboardData  instanceId:'  ,instanceId);
        if( this.whiteboardViewMap.has(instanceId) ){
            this.whiteboardViewMap.get(instanceId).resetWhiteboardData();
        }
    };

    /*重置所有白板的数据*/
    resetAllWhiteboardData(){
		L.Logger.debug('[whiteboarrd-sdk]resetAllWhiteboardData ');
        for( let whiteboardView of this.whiteboardViewMap.values()  ){
            whiteboardView.resetWhiteboardData();
        }
    };

    /*重置纯白板总页数*/
    resetPureWhiteboardTotalPage(){
		L.Logger.debug('[whiteboarrd-sdk]resetPureWhiteboardTotalPage ');
		let oldTotalPage = this.pureWhiteboardFileinfo.pagenum ;
        this.pureWhiteboardFileinfo.pagenum = 1 ;
        let whiteboardView =  this.whiteboardViewMap.get('default') ;
        if( whiteboardView && Utils.isFunction( whiteboardView.resetPureWhiteboardTotalPage ) ){
            whiteboardView.resetPureWhiteboardTotalPage( oldTotalPage );
        }
    }

    /*改变动态PPT音量
    * @params volume:音量大小(0-100)，Int
    * */
    changeDynamicPptVolume( volume ){
		L.Logger.debug('[whiteboarrd-sdk]changeDynamicPptVolume volume:',volume);
        if( typeof volume === 'number' && this.whiteboardViewMap.has('default') ){
            let whiteboardView =  this.whiteboardViewMap.get('default');
            if( volume < 0 ){
                volume = 0;
            }else if(volume > 100){
                volume = 100 ;
            }
            let pubmsgData = {
                name: 'PptVolumeControl' ,
                id: 'PptVolumeControl' ,
                toID: '__allExceptSender' ,
                data: {
                    volume:volume / 100
                },
                save: true ,
            };
            this.receiveEventRoomPubmsg({ type:'room-pubmsg' , message:pubmsgData });
            if( whiteboardView.getConfigration().synchronization &&  whiteboardView.getConfigration().isConnectedRoom ){
                this.pubMsg( pubmsgData );
            }
        }
    }

    /*打开文档备注*/
    openDocumentRemark(){
		L.Logger.debug('[whiteboarrd-sdk]openDocumentRemark ');
        if( this.whiteboardViewMap.has('default') ){
            let whiteboardView =  this.whiteboardViewMap.get('default');
            whiteboardView.changeDocumentRemarkState( true );
        }
    }

    /*关闭文档备注*/
    closeDocumentRemark(){
		L.Logger.debug('[whiteboarrd-sdk]closeDocumentRemark ');
        if( this.whiteboardViewMap.has('default') ){
            let whiteboardView =  this.whiteboardViewMap.get('default');
            whiteboardView.changeDocumentRemarkState( false );
        }
    }

    /*执行白板的动作
     * @params actionKey:白板动作的key ， key值描述如下：
     action_clear:清空白板画笔
     action_redo:恢复白板画笔
     action_undo:撤销白板画笔
     * @params instanceId:白板实例id
     * */
    executeWhiteboardAction( actionKey ,  instanceId = 'default' ){
		L.Logger.debug('[whiteboarrd-sdk]executeWhiteboardAction actionKey and	instanceId:',actionKey,instanceId);
        if( this.whiteboardViewMap.has(instanceId) ){
            this.whiteboardViewMap.get(instanceId).executeWhiteboardAction( actionKey );
        }
    }

    /*执行缩放白板
     * @params zoomKey:白板缩放的key ， key值描述如下：
     zoom_big:放大白板
     zoom_small:缩小白板
     * @params instanceId:白板实例id
     * */
    executeZoomWhiteaord( zoomKey ,  instanceId = 'default' ){
		L.Logger.debug('[whiteboarrd-sdk]executeZoomWhiteaord 	zoomKey and	instanceId:',zoomKey,instanceId);
        if( this.whiteboardViewMap.has(instanceId) ){
            this.whiteboardViewMap.get(instanceId).executeZoomWhiteaord( zoomKey );
        }
    }

    /*处理room-pubmsg*/
    receiveEventRoomPubmsg(recvEventData){
		L.Logger.debug('[whiteboarrd-sdk]receiveEventRoomPubmsg 	recvEventData:',recvEventData);
        if(typeof recvEventData === 'string'){
            recvEventData = JSON.parse(recvEventData);
        }
        let pubmsgData = recvEventData.message ;
        if( this._isWhiteboardCorrelationSignalling( pubmsgData.name ) ){
            if(pubmsgData.name === 'SharpsChange'){
                if( pubmsgData.data && pubmsgData.data.nickname ) {
                    pubmsgData.remindContent = pubmsgData.data.nickname ;
                }else if( this.room && Utils.isFunction( this.room.getUser ) &&  this.room.getUser(pubmsgData.fromID) &&  typeof this.room.getUser(pubmsgData.fromID) === 'object' &&  this.room.getUser(pubmsgData.fromID).nickname ){
                    pubmsgData.remindContent = this.room.getUser(pubmsgData.fromID).nickname;
                };
                WhiteboardIntermediateLayerInstance.handlerPubmsg_SharpsChange(pubmsgData);
            }else if(pubmsgData.name === 'WBPageCount'){
                this.pureWhiteboardFileinfo.pagenum = pubmsgData.data.totalPage ;
            }else{
                if( pubmsgData.name === 'ShowPage' || pubmsgData.name === 'whiteboardMarkTool' || pubmsgData.name === 'NewPptTriggerActionClick' || pubmsgData.name === 'PptVolumeControl' || pubmsgData.name === 'H5DocumentAction' ){
                    if(pubmsgData.name === 'ShowPage'){
                        if(typeof pubmsgData.data === 'string'){
                            pubmsgData.data = Utils.toJsonParse(pubmsgData.data);
                        }
                        if(pubmsgData.data.isGeneralFile && pubmsgData.data.filedata &&  pubmsgData.data.filedata.fileid == 0){
                            pubmsgData.data.filedata.pagenum = this.pureWhiteboardFileinfo.pagenum;
                        }
                    }
                    if( this.whiteboardViewMap.has('default') ){
                        this.whiteboardViewMap.get('default').receiveEventRoomPubmsg( recvEventData ) ;
                    }
                }else{
                    for( let  whiteboardView  of this.whiteboardViewMap.values() ){
                        whiteboardView.receiveEventRoomPubmsg(recvEventData);
                    }
                }
            }
        }
    };

    /*处理room-connected*/
    receiveEventRoomConnected(recvEventData){
		L.Logger.debug('[whiteboarrd-sdk]receiveEventRoomConnected 	recvEventData:',recvEventData);
        // 房间连接成功处理清空数据的相关操作
        this.resetAllWhiteboardData();
        this.resetPureWhiteboardTotalPage();
        let msgs = recvEventData.message ;
        this.receiveEventRoomMsglist(  JSON.stringify( {type: 'room-msglist', message:msgs} ) );
    };

    /*失去连接*/
    receiveEventRoomDisconnected(){
		L.Logger.debug('[whiteboarrd-sdk]receiveEventRoomDisconnected ');
        for( let  whiteboardView  of this.whiteboardViewMap.values() ){
            if( whiteboardView && whiteboardView.getConfigration() && whiteboardView.getConfigration().isDisconnectedClearWhiteboardData && Utils.isFunction( whiteboardView.resetWhiteboardData ) ){
                whiteboardView.resetWhiteboardData(); //失去连接且有配置项则清除所有数据
            }
        }
    }

    /*处理room-delmsg*/
    receiveEventRoomDelmsg(recvEventData){
		L.Logger.debug('[whiteboarrd-sdk]receiveEventRoomDelmsg 	recvEventData:',recvEventData);
        if(typeof recvEventData === 'string'){
            recvEventData = JSON.parse(recvEventData);
        }
        let delmsgData = recvEventData.message ;
        if( this._isWhiteboardCorrelationSignalling( delmsgData.name ) ){
            if(delmsgData.name === 'SharpsChange'){
                WhiteboardIntermediateLayerInstance.handlerDelmsg_SharpsChange(delmsgData);
            }else{
                for( let whiteboardView of this.whiteboardViewMap.values() ){
                    whiteboardView.receiveEventRoomDelmsg(recvEventData);
                }
            }
        }
    };

    /*处理room-msglist*/
    receiveEventRoomMsglist(recvEventData){
		L.Logger.debug('[whiteboarrd-sdk]receiveEventRoomMsglist 	recvEventData:',recvEventData);
        if(typeof recvEventData === 'string'){
            recvEventData = JSON.parse(recvEventData);
        }
        let tmpSignallingData =  {};
        let messageListData = recvEventData.message ;
        for(let x in messageListData) {
            if( this._isWhiteboardCorrelationSignalling( messageListData[x].name ) ){
                if(messageListData[x].data && typeof messageListData[x].data === "string") {
                    messageListData[x].data = JSON.parse(messageListData[x].data);
                }
                if(tmpSignallingData[messageListData[x].name] === null || tmpSignallingData[messageListData[x].name] === undefined) {
                    tmpSignallingData[messageListData[x].name] = [];
                    tmpSignallingData[messageListData[x].name].push(messageListData[x]);
                } else {
                    tmpSignallingData[messageListData[x].name].push(messageListData[x]);
                }
            }
        };

        /*加页数据*/
        let wBPageCountArr = tmpSignallingData["WBPageCount"];
        if(wBPageCountArr !== null && wBPageCountArr !== undefined && wBPageCountArr.length > 0) {
            this.pureWhiteboardFileinfo.pagenum = wBPageCountArr[wBPageCountArr.length - 1].data.totalPage ;
        }
        tmpSignallingData["WBPageCount"] = null;
        delete tmpSignallingData["WBPageCount"] ;

        let signallingNameArray = ['ShowPage' , 'whiteboardMarkTool' , 'NewPptTriggerActionClick', 'PptVolumeControl' , 'H5DocumentAction'] ;
        for(let signallingName of signallingNameArray){
            let signallingArray = tmpSignallingData[signallingName];
            if(signallingName === 'ShowPage' && signallingArray && signallingArray.length){
                for(let pubmsgData of signallingArray){
                    if(pubmsgData.name === 'ShowPage'){
                        if(typeof pubmsgData.data === 'string'){
                            pubmsgData.data = Utils.toJsonParse(pubmsgData.data);
                        }
                        if(pubmsgData.data.isGeneralFile && pubmsgData.data.filedata &&  pubmsgData.data.filedata.fileid == 0){
                            pubmsgData.data.filedata.pagenum = this.pureWhiteboardFileinfo.pagenum;
                        }
                    }
                }
            }
            /*if( signallingName === 'ShowPage' && !( signallingArray !== null && signallingArray !== undefined && signallingArray.length > 0 ) ){
                if( this.whiteboardViewMap.has('default') ){
                    this.whiteboardViewMap.get('default').saveFiledataAndLoadCurrpageWhiteboardData( ) ;
                }
            }*/
            if(signallingArray !== null && signallingArray !== undefined && signallingArray.length > 0) {
                if( this.whiteboardViewMap.has('default') ){
                    this.whiteboardViewMap.get('default').receiveEventRoomMsglist( signallingName ,  signallingArray[ signallingArray.length - 1 ] ) ;
                }
            };
            tmpSignallingData[signallingName] = null;
            delete tmpSignallingData[signallingName] ;
        }

        /*画笔数据*/
        let sharpsChangeArr = tmpSignallingData["SharpsChange"];
        if(sharpsChangeArr !== null && sharpsChangeArr !== undefined && sharpsChangeArr.length > 0) {
            WhiteboardIntermediateLayerInstance.handlerMsglist_SharpsChange(sharpsChangeArr);
        }
        tmpSignallingData["SharpsChange"] = null;
        delete tmpSignallingData["SharpsChange"] ;

        tmpSignallingData = null ;
    };


    reveiveEventRoomUsermediaorfilestateChanged(recvEventData){
        L.Logger.debug('[whiteboarrd-sdk]reveiveEventRoomUsermediaorfilestateChanged recvEventData:',recvEventData);
        this._forwardingStreamEvents( 'reveiveEventRoomUsermediaorfilestateChanged' ,  recvEventData );
    }

    reveiveEventRoomUsermediaorfileattributesUpdate(recvEventData){
        L.Logger.debug('[whiteboarrd-sdk]reveiveEventRoomUsermediaorfileattributesUpdate recvEventData:',recvEventData);
        this._forwardingStreamEvents( 'reveiveEventRoomUsermediaorfileattributesUpdate' ,  recvEventData );
    }

    receiveEventRoomErrorNotice(recvEventData){
        L.Logger.debug('[whiteboarrd-sdk]receiveEventRoomErrorNotice recvEventData:',recvEventData);
        this._forwardingStreamEvents( 'receiveEventRoomErrorNotice' ,  recvEventData );
    }

    /*接收room-receiveActionCommand*/
    reveiveEventRoomReceiveActionCommand(recvEventData){
		L.Logger.debug('[whiteboarrd-sdk]reveiveEventRoomReceiveActionCommand 	recvEventData:',recvEventData);
        let { action , cmd } = recvEventData.message ;
        switch ( action ){
            case 'transmitWindowSize':
                this._windowResizeCallback();
                break;
        }
        if( this.whiteboardViewMap.has('default') ){
            let whiteboardView = this.whiteboardViewMap.get('default') ;
            whiteboardView.reveiveEventRoomReceiveActionCommand( action , cmd );
        }
    };

    /*设置房间*/
    registerRoomDelegate( room  , sdkReceiveActionCommand ){
		L.Logger.debug('[whiteboarrd-sdk]registerRoomDelegate 	room and  sdkReceiveActionCommand:',room , sdkReceiveActionCommand);
        this.room = room ;
        this.sdkReceiveActionCommand = sdkReceiveActionCommand ;
        this._addRoomEvent();
    };

    /*获取房间*/
    getRoomDelegate(){
		L.Logger.debug('[whiteboarrd-sdk]getRoomDelegate ');
        return this.room ;
    };

    /*是否有房间属性*/
    hasRoomDelegate(){
		L.Logger.debug('[whiteboarrd-sdk]hasRoomDelegate ');
        return !!this.room  ;
    };

    /*发送动作指令给sdk
     * @params action：执行的动作
         action目前有：
            whiteboardSdkNotice_ShowPage:翻页消息通知给sdk
     * @params cmd:动作描述
    * */
    sendActionCommandToSdk(action , cmd){
		L.Logger.debug('[whiteboarrd-sdk]sendActionCommandToSdk 	action and	cmd:',action , cmd);
        if( this.sdkReceiveActionCommand && typeof this.sdkReceiveActionCommand === 'function' ){
            if( typeof cmd && !Array.isArray(cmd) ){
                cmd = JSON.parse( JSON.stringify( cmd ) );
            }
            this.sdkReceiveActionCommand(action , cmd);
        }
    }

    /*发送PubMsg信令
     * @allParams params:pubMsg需要的所有参数承接对象
     * @params params.name:信令名字 , String
     * @params params.id:信令ID , String
     * @params params.toID:发送给谁(默认发给所有人) , String
     __all（所有人，包括自己） ,
     __allExceptSender （除了自己以外的所有人）,
     userid（指定id发给某人） ,
     __none （谁也不发，只有服务器会收到）,
     __allSuperUsers（只发给助教和老师）,
     __group:groupA:groupB(发送给指定组，组id不能包含冒号),
     __groupExceptSender:groupA（发给指定组，不包括自己）
     * @params params.data:信令携带的数据 , Json/JsonString
     * @params params.save:信令是否保存 , Boolean
     * @params params.expiresabs:暂时不用
     * @params params.associatedMsgID:绑定的父级信令id , String
     * @params params.associatedUserID:绑定的用户id , String
     * @params params.expires:暂时无效
     * @params params.type:扩展类型，目前只有count一种扩展类型，之后如需扩展可在此处进行相应变动 , String (目前直播才有用)
     * @params params.write2DB:暂时无效, Boolean (目前直播才有用)
     * @params params.actions:执行的动作操作列表，目前只有0，1 (0-不操作，1-代表增加操作), Array (目前直播才有用)
     * @params params.do_not_replace:老师和助教不能同时操作，后操作的服务器直接丢弃, Boolean (目前直播才有用)
     * 备注：指定用户会收到事件room-pubmsg
     * */
    pubMsg(params){
		L.Logger.debug('[whiteboarrd-sdk]pubMsg 	params :',params);
        if( this.room && this.room.pubMsg ){
            if( typeof params === 'string' ){
                params = JSON.parse( params ) ;
            }
            if( params.name === 'WBPageCount' ){
                this.pureWhiteboardFileinfo.pagenum = params.data.totalPage ;
            }
            if( params.data && typeof params.data === 'object' && !Array.isArray(params.data) ){
                params.data = JSON.stringify(params.data);
            }
            this.room.pubMsg( params );
        }
    };

    /*发送DelMsg信令功能函数,删除之前发送的信令
     * @allParams params:delMsg需要的所有参数承接对象
     * @params msgName:信令名字 , String
     * @params msgId:信令ID , String
     * @params toId:发送给谁(默认发给所有人) , String
     __all（所有人，包括自己） ,
     __allExceptSender （除了自己以外的所有人）,
     userid（指定id发给某人） ,
     __none （谁也不发，只有服务器会收到）,
     __allSuperUsers（只发给助教和老师）,
     __group:groupA:groupB(发送给指定组，组id不能包含冒号),
     __groupExceptSender:groupA（发给指定组，不包括自己）
     * @params data:信令携带的数据 , Json/JsonString
     *备注：指定用户会收到事件room-delmsg
     * */
    delMsg(params){
		L.Logger.debug('[whiteboarrd-sdk]delMsg params :',params);
        if( this.room && this.room.delMsg ){
            if( params.data && typeof params.data === 'object' && !Array.isArray(params.data) ){
                params.data = JSON.stringify(params.data);
            }
            this.room.delMsg( params );
        }
    };

    /*开始共享媒体文件*/
    startShareMedia( url , isVideo , toID , attrs = {} ){
		L.Logger.debug('[whiteboarrd-sdk]startShareMedia url  isVideo  toID  and  attrs:',url  ,isVideo  ,toID  ,attrs);
        this.stopShareMedia();
        this.stopShareLocalMedia();
        if( this.room && this.room.startShareMedia ){
            let whiteboardView = this.whiteboardViewMap.get('default') ;
            if(isVideo && whiteboardView && whiteboardView.getConfigration() && whiteboardView.getConfigration().mediaSharePauseWhenOver){
                attrs['pauseWhenOver'] = whiteboardView.getConfigration().mediaSharePauseWhenOver ;
            }
            if( whiteboardView && whiteboardView.getConfigration() && whiteboardView.getConfigration().myUserId !== undefined && !whiteboardView.getConfigration().synchronization ){
                toID = whiteboardView.getConfigration().myUserId ;
            }
            if( TK.SDKTYPE !== 'mobile'){
                this.room.startShareMedia( url , isVideo , (failinfo)=>{
                    L.Logger.warning('[whiteboard-sdk]startShareMedia fail , fail info:'+failinfo);
                } , {toID , attrs}  );
            }else{
                this.room.startShareMedia( url , isVideo ,  toID , attrs  );
            }
        }
    };

    /*停止共享媒体文件*/
    stopShareMedia(){
        L.Logger.debug('[whiteboarrd-sdk]stopShareMedia ');
        if(this.room && this.room.stopShareMedia){
            this.room.stopShareMedia();
        }
    };

    /*停止共享本地媒体文件*/
    stopShareLocalMedia(){
        if( TK.SDKTYPE !== 'mobile' && this.room && this.room.stopShareLocalMedia ){
            L.Logger.debug('[whiteboarrd-sdk]stopShareLocalMedia ');
            this.room.stopShareLocalMedia();
        }
    };

    /*创建音频播放器
    * @params parentNode:承放的节点
    * @params config:配置项*/
    createAudioPlayer( parentNode , config = {} ){
		L.Logger.debug('[whiteboarrd-sdk]createAudioPlayer parentNode and config :', parentNode , config);
        if(!window.TalkAudioPlayer){
            L.Logger.error('The resource file for the audio player is not loaded and can\'t be executed with createAudioPlayer methods.');
            return ;
        }
        if( typeof parentNode === 'string'){
            let parentNodeStr = parentNode ;
            parentNode = document.getElementById( parentNodeStr );
            if(!parentNode){
                L.Logger.warning('The node id cannot be found by node id, and createAudioPlayer method cannot be performed , element id is '+parentNodeStr+'.');
                return ;
            }
        }
        let instanceId = 'default' ;
        let whiteboardView = this.whiteboardViewMap.get( instanceId ) ;
        let elementNode = parentNode || ( whiteboardView ? whiteboardView.getWhiteboardRootElement() : document.body ) ;
        if( this.audioPlayerView && this.audioPlayerView.destroyView){
            this.audioPlayerView.destroyView();
            this.audioPlayerView = undefined ;
        }
        this.audioPlayerView = new window.TalkAudioPlayer( elementNode , instanceId , this  , Object.deepAssign({} , config , {
                languageType:whiteboardView ? whiteboardView.getConfigration().languageType : 'ch' ,
                isMobile:whiteboardView ? whiteboardView.getConfigration().isMobile : false  ,
            } , Configuration.commonWhiteboard ) , whiteboardView ? whiteboardView.getConfigration():undefined
        );
    };

    /*创建视频播放器
     * @params parentNode:承放的节点
     * @params config:配置项*/
    createVideoPlayer( parentNode , config = {} ){
		L.Logger.debug('[whiteboarrd-sdk]createVideoPlayer parentNode and config :', parentNode , config);
        if(!window.TalkVideoPlayer){
            L.Logger.error('The resource file for the audio player is not loaded and can\'t be executed with createVideoPlayer methods.');
            return ;
        }
        if( typeof parentNode === 'string'){
            let parentNodeStr = parentNode ;
            parentNode = document.getElementById( parentNodeStr );
            if(!parentNode){
                L.Logger.warning('The node id cannot be found by node id, and createVideoPlayer method cannot be performed , element id is '+parentNodeStr+'.');
                return ;
            }
        }
        let instanceId = 'default' ;
        let whiteboardView = this.whiteboardViewMap.get( instanceId ) ;
        let elementNode = parentNode || ( whiteboardView ? whiteboardView.getWhiteboardRootElement() : document.body ) ;
        if( this.videoPlayerView && this.videoPlayerView.destroyView){
            this.videoPlayerView.destroyView();
            this.videoPlayerView = undefined ;
        }
        this.videoPlayerView = new window.TalkVideoPlayer( elementNode , instanceId , this  , Object.deepAssign({} , config , {
                languageType:whiteboardView ? whiteboardView.getConfigration().languageType : 'ch' ,
                isMobile:whiteboardView ? whiteboardView.getConfigration().isMobile : false  ,
            } , Configuration.commonWhiteboard ) , whiteboardView ? whiteboardView.getConfigration():undefined
        );
    };

    /*创建课件备注视图
     * @params parentNode:承放的节点
     * @params config:配置项*/
    createDocumentRemark( parentNode , config = {} ){
		L.Logger.debug('[whiteboarrd-sdk]createDocumentRemark parentNode and config :', parentNode , config);
        if(!window.TalkDocumentRemark){
            L.Logger.error('The resource file for the document tool bar is not loaded and can\'t be executed with createDocumentRemark methods.');
            return ;
        }
        if( typeof parentNode === 'string'){
            let parentNodeStr = parentNode ;
            parentNode = document.getElementById( parentNodeStr );
            if(!parentNode){
                L.Logger.warning('The node id cannot be found by node id, and createDocumentRemark method cannot be performed , element id is '+parentNodeStr+'.');
                return ;
            }
        }
        let instanceId = 'default' ;
        let whiteboardView = this.whiteboardViewMap.get( instanceId ) ;
        let elementNode = parentNode || ( whiteboardView ? whiteboardView.getWhiteboardRootElement() : document.body ) ;
        if( this.documentRemarkView && this.documentRemarkView.destroyView){
            this.documentRemarkView.destroyView();
            this.documentRemarkView = undefined ;
        }
        this.documentRemarkView = new window.TalkDocumentRemark(elementNode , instanceId , this , Object.deepAssign( {} , config , {
            languageType:whiteboardView ? whiteboardView.getConfigration().languageType : 'ch' ,
            isMobile:whiteboardView ? whiteboardView.getConfigration().isMobile : false  ,
            canRemark:whiteboardView ? whiteboardView.getConfigration().canRemark : false  ,
        } , Configuration.commonWhiteboard ) , whiteboardView ? whiteboardView.getConfigration():undefined );
        if( whiteboardView ){
            let whiteboardViewState = this.getWhiteboardViewState();
            if( this.documentRemarkView && this.documentRemarkView.receiveActionCommand && whiteboardViewState && Object.keys( whiteboardViewState.page ).length && Object.keys( whiteboardViewState.zoom ).length ){
                let action = 'viewStateUpdate' , cmd = {
                    viewState:whiteboardViewState ,
                    updateViewState:{} ,
                };
                this.documentRemarkView.receiveActionCommand(action , cmd);
            }
        }
    };

    /*创建白板翻页工具条
     * @params parentNode:承放的节点
     * @params config:配置项*/
    createDocumentToolBar( parentNode , config = {} ){
		L.Logger.debug('[whiteboarrd-sdk]createDocumentToolBar parentNode and config :', parentNode , config);
        if(!window.TalkDocumentToolbar){
            L.Logger.error('The resource file for the document tool bar is not loaded and can\'t be executed with createDocumentToolBar methods.');
            return ;
        }
        if( typeof parentNode === 'string'){
            let parentNodeStr = parentNode ;
            parentNode = document.getElementById( parentNodeStr );
            if(!parentNode){
                L.Logger.warning('The node id cannot be found by node id, and createDocumentToolBar method cannot be performed , element id is '+parentNodeStr+'.');
                return ;
            }
        }
        let instanceId = 'default' ;
        let whiteboardView = this.whiteboardViewMap.get( instanceId ) ;
        let elementNode = parentNode || ( whiteboardView ? whiteboardView.getWhiteboardRootElement() : document.body ) ;
        if( this.documentToolbarView && this.documentToolbarView.destroyView){
            this.documentToolbarView.destroyView();
            this.documentToolbarView = undefined ;
        }
        this.documentToolbarView = new window.TalkDocumentToolbar(elementNode , instanceId , this , Object.deepAssign( {} , config , {
            languageType:whiteboardView ? whiteboardView.getConfigration().languageType : 'ch' ,
            isMobile:whiteboardView ? whiteboardView.getConfigration().isMobile : false  ,
            canRemark:whiteboardView ? whiteboardView.getConfigration().canRemark : false  ,
        } , Configuration.commonWhiteboard ) ,whiteboardView ? whiteboardView.getConfigration():undefined );
        if( whiteboardView ){
            let whiteboardViewState = this.getWhiteboardViewState();
            if( this.documentToolbarView && this.documentToolbarView.receiveActionCommand && whiteboardViewState && Object.keys( whiteboardViewState.page ).length && Object.keys( whiteboardViewState.zoom ).length ){
                let action = 'viewStateUpdate' , cmd = {
                    viewState:whiteboardViewState ,
                    updateViewState:{} ,
                };
                this.documentToolbarView.receiveActionCommand(action , cmd);
            }
        }
    };

    /*创建白板标注工具条
     * @params parentNode:承放的节点
     * @params config:配置项*/
    createWhiteboardToolBar( parentNode , config = {} , instanceId = 'default' ){
		L.Logger.debug('[whiteboarrd-sdk]createWhiteboardToolBar parentNode  config  and instanceId :', parentNode , config , instanceId);
        if(!window.TalkWhiteboardToolbar){
            L.Logger.error('The resource file for the document tool bar is not loaded and can\'t be executed with TalkWhiteboardToolbar methods.');
            return ;
        }
        if( typeof parentNode === 'string'){
            let parentNodeStr = parentNode ;
            parentNode = document.getElementById( parentNodeStr );
            if(!parentNode){
                L.Logger.warning('The node id cannot be found by node id, and TalkWhiteboardToolbar method cannot be performed , element id is '+parentNodeStr+'.');
                return ;
            }
        }
        let whiteboardView = this.whiteboardViewMap.get( instanceId ) ;
        let elementNode = parentNode || ( whiteboardView ? whiteboardView.getWhiteboardRootElement() : document.body ) ;
        if( this.whiteboardToolbarViewList[instanceId] && this.whiteboardToolbarViewList[instanceId].destroyView){
            this.whiteboardToolbarViewList[instanceId].destroyView();
            this.whiteboardToolbarViewList[instanceId] = undefined ;
        }
        this.whiteboardToolbarViewList[instanceId] = new window.TalkWhiteboardToolbar(elementNode , instanceId , this  , Object.deepAssign({} , config , {
                languageType:whiteboardView ? whiteboardView.getConfigration().languageType : 'ch' ,
                isMobile:whiteboardView ? whiteboardView.getConfigration().isMobile : false  ,
            } , Configuration.commonWhiteboard ) , whiteboardView ? whiteboardView.getConfigration():undefined );
        if( whiteboardView ){
            let whiteboardViewState = this.getWhiteboardViewState();
            if( this.whiteboardToolbarViewList[instanceId] &&  this.whiteboardToolbarViewList[instanceId].receiveActionCommand && whiteboardViewState && Object.keys( whiteboardViewState.page ).length && Object.keys( whiteboardViewState.zoom ).length ){
                let action = 'viewStateUpdate' , cmd = {
                    viewState:whiteboardViewState ,
                    updateViewState:{} ,
                };
                this.whiteboardToolbarViewList[instanceId].receiveActionCommand(action , cmd);
            }
        }
    };

    /*获取白板视图状态*/
    getWhiteboardViewState(){
		L.Logger.debug('[whiteboarrd-sdk]getWhiteboardViewState ');
        let instanceId = 'default' ;
        let whiteboardView = this.whiteboardViewMap.get( instanceId ) ;
        if( whiteboardView ) {
            return whiteboardView.getWhiteboardViewState();
        }else{
            return undefined
        }
    }

    /*获取白板中间层*/
    getWhiteboardIntermediateLayerInstance(){
		L.Logger.debug('[whiteboarrd-sdk]getWhiteboardIntermediateLayerInstance ');
        return WhiteboardIntermediateLayerInstance ;
    }

    /*切换文档服务器
    * @params docAddressIndex:文档地址域名 String类型
    * @params isSaveLocalStorage:是否保存本地存储 ， 默认false
    * @params forceReloadDocument:是否强制重新加载文档 ， 默认false（即： 只有文档地址索引和当前索引不一致才会重新加载）
     * */
    switchDocAddress( docAddressKey , isSaveLocalStorage = false , forceReloadDocument = false ){
        L.Logger.debug('[whiteboarrd-sdk]call switchDocAddress method , docAddressKey is '+ docAddressKey);
        if( docAddressKey && typeof docAddressKey === 'string' ){
            if(Utils.getItem(Global.docAddressList,docAddressKey) === ''){
               if(Global.protocol && Global.port) {
                   Global.laterAddressList.push({protocol:Global.protocol,hostname:docAddressKey ,port:Global.port});
               }
                Global.docAddressList =  [...Global.docAddressList,...Global.laterAddressList]
            }
            if(  Global.docAddressKey !== docAddressKey ){
                let oldForceUseDocAddress = Utils.getItem(Global.docAddressList,Global.docAddressKey);
                Global.docAddressKey = docAddressKey ;
                Global.nowUseDocAddress = Utils.getItem(Global.docAddressList,Global.docAddressKey) || Configuration.commonWhiteboard.docAddress;
                if( isSaveLocalStorage ){
                    this.setLocalStorageItem( 'tkDocAddressKey' , Global.docAddressKey );
                }
                let whiteboardView = this.whiteboardViewMap.get('default') ;
                if( whiteboardView ){
                    whiteboardView.reloadCurrentDocument();
                    whiteboardView.sendActionCommand( 'docAddressUpdate' ,  {
                        docAddressList:[ ...Global.docAddressList ],
                        docAddressKey:Global.docAddressKey ,
                        oldDocAddress:oldForceUseDocAddress ,
                        nowDocAddress:Global.docAddressList[Global.docAddressKey] || Configuration.commonWhiteboard.docAddress
                    });
                }
            }else if( forceReloadDocument ){
                let whiteboardView = this.whiteboardViewMap.get('default') ;
                if( whiteboardView ){
                    whiteboardView.reloadCurrentDocument();
                }
            }
        }else if( forceReloadDocument ){
            let whiteboardView = this.whiteboardViewMap.get('default') ;
            if( whiteboardView ){
                whiteboardView.reloadCurrentDocument();
            }
        }
    }

    /*设置本地存储*/
    setLocalStorageItem( key , value ){
        if( TK.SDKTYPE === 'mobile' ){
            if( this.room && Utils.isFunction( this.room.setLocalStorageItem ) ){
                this.room.setLocalStorageItem( key  ,  value ) ;
            }
        }else{
            Utils.setLocalStorageItem( key , value );
        }
    }

    /*获取本地存储*/
    getLocalStorageItem( key , callback ){
        if( Utils.isFunction( callback ) ){
            if( TK.SDKTYPE === 'mobile' ){
                if( this.room && Utils.isFunction( this.room.getLocalStorageItem ) ){
                    try{
                        this.room.getLocalStorageItem( key  , (docAddressKey) => {
                            callback( docAddressKey );
                        }) ;
                    }catch (e){
                        L.Logger.error('[whiteboard-sdk]getLocalStorageItem error:' , e);
                    }
                }
            }else{
                callback( Utils.getLocalStorageItem( 'tkDocAddressKey') );
            }
        }
    };

    /*创建白板
     * @params parentNode:白板的父节点 , 默认为 document.body ， ElementNode
     * @params instanceId:白板实例id , 默认为'default' , String
     * @params configration:白板配置项 , 默认为{} ,  Json
     * @params receiveActionCommand:接受白板动作指令函数 , Function
    * */
    _createWhiteboard( parentNode = document.body ,  instanceId = 'default',  configration = {} , receiveActionCommand ){
		L.Logger.debug('[whiteboarrd-sdk]_createWhiteboard  parentNode  instanceId  configration  and	receiveActionCommand:',parentNode , instanceId , configration  ,receiveActionCommand);
        if( typeof parentNode === 'string'){
            let parentNodeStr = parentNode ;
            parentNode = document.getElementById( parentNodeStr );
            if(!parentNode){
                L.Logger.warning('The node id cannot be found by node id, and createWhiteboard method cannot be performed , element id is '+parentNodeStr+'.');
                return ;
            }
        }
        let defaultWhiteboard = undefined ;
        if( this.awitWhiteboardConfigrationMap.has(instanceId) ){
            defaultWhiteboard = this.awitWhiteboardConfigrationMap.get(instanceId) ;
            this.awitWhiteboardConfigrationMap.delete(instanceId);
        }else{
            defaultWhiteboard = Object.deepAssign( {} , Configuration.defaultWhiteboard , Configuration.commonWhiteboard ) ;
        }
        let whiteboardViewConfigration = Object.deepAssign({} , defaultWhiteboard, configration);
        if( this.whiteboardViewMap.has(instanceId) ){
            this._destroyWhiteboard(instanceId);
        }
        this.whiteboardViewMap.set(instanceId , new WhiteboardView( parentNode , instanceId , whiteboardViewConfigration , (...args) => {
            if( this.whiteboardToolbarViewList[instanceId] && this.whiteboardToolbarViewList[instanceId].receiveActionCommand){
                this.whiteboardToolbarViewList[instanceId].receiveActionCommand(...args);
            }
            if(typeof receiveActionCommand === 'function'){
                receiveActionCommand(...args);
            }
        } , this ) ) ;
        let whiteboardView = this.whiteboardViewMap.get( instanceId ) ;
        if( whiteboardView && whiteboardView.getConfigration().isLoadWhiteboardToolBar ){
            let whiteboardToolBarParentNode = whiteboardView.getConfigration().whiteboardToolBarConfig.parentNode ||  whiteboardView.getWhiteboardRootElement();
            this.createWhiteboardToolBar( whiteboardToolBarParentNode , whiteboardView.getConfigration().whiteboardToolBarConfig , instanceId );
        }
    };

    /*销毁白板*/
    _destroyWhiteboard( instanceId = 'default'){
		L.Logger.debug('[whiteboarrd-sdk]_destroyWhiteboard    instanceId  :',instanceId );
        if( this.whiteboardViewMap.has(instanceId) ){
            this.whiteboardViewMap.get(instanceId).destroyWhiteboardView();
            this.whiteboardViewMap.delete(instanceId);
        }
        if( this.awitWhiteboardConfigrationMap.has(instanceId) ){
            this.awitWhiteboardConfigrationMap.delete(instanceId);
        }
    };

    /*是否是白板相关信令*/
    _isWhiteboardCorrelationSignalling(name){
		L.Logger.debug('[whiteboarrd-sdk]_isWhiteboardCorrelationSignalling    name  :',name );
        let isWhiteboardCorrelationSignalling = false ;
        switch (name){
            case 'SharpsChange':
            case 'ShowPage':
            case 'WBPageCount':
            case 'NewPptTriggerActionClick':
            case 'PptVolumeControl':
            case 'H5DocumentAction':
            case 'whiteboardMarkTool':
            // case 'VideoWhiteboard':
            // case 'BlackBoard':
                isWhiteboardCorrelationSignalling = true ;
                break;
        }
        return isWhiteboardCorrelationSignalling ;
    };

    /*窗口改变事件处理方法*/
    _windowResizeCallback(){
		L.Logger.debug('[whiteboarrd-sdk]_windowResizeCallback ' );
        this.updateAllWhiteboardSize();
        return false ;
    };

    /*收到iframe的消息处理方法*/
    _windowMessageCallback(event){
		L.Logger.debug('[whiteboarrd-sdk]_windowMessageCallback');
        event = event || window.event ;
        if( this.whiteboardViewMap.has('default') ){
            this.whiteboardViewMap.get('default').receiveWindowMessageEvent( event ) ;
        }
        if( this.documentToolbarView ){
            this.documentToolbarView.receiveWindowMessageEvent( event ) ;
        }
        return false;
    };

    /*键盘按下事件*/
    _documentKeydownCallback( event ){
		L.Logger.debug('[whiteboarrd-sdk]_documentKeydownCallback');
        event = event || window.event ;
        switch (event.keyCode){
            case 27: //ESC键
                if( Utils.isFullScreenStatus() ){
                    Utils.exitFullscreen();
                }
                break;
        }
        if( !Global.isSkipPageing &&  this.whiteboardViewMap.has('default') ){
            if( this.whiteboardViewMap.get('default').getConfigration().isUseKeyboardPage ){
                if(  !this.whiteboardViewMap.get('default').isWhiteboardTextEditing() ){
                    switch (event.keyCode){
                        case 37://左键
                            this.whiteboardViewMap.get('default').prevPage();
                            break;
                        case 38://上键
                            this.whiteboardViewMap.get('default').prevStep();
                            break;
                        case 39://右键
                            this.whiteboardViewMap.get('default').nextPage();
                            break;
                        case 40://下键
                            this.whiteboardViewMap.get('default').nextStep();
                            break;
                    }
                }
            }
        }
        return false;
    }

    _documentFullscreenchangeCallback( event ){
		L.Logger.debug('[whiteboarrd-sdk]_documentFullscreenchangeCallback');
        if( this.whiteboardViewMap.has('default') ){
            let whiteboardView = this.whiteboardViewMap.get('default') ;
            if( Utils.isFullScreenStatus() ){
                let fullScreenElement = whiteboardView.getWhiteboardRootElement() ;
                let { fullScreenElementId } =  whiteboardView.getConfigration().documentToolBarConfig ;
                if( fullScreenElementId ){
                    if( typeof  fullScreenElementId === 'string' ){
                        if( document.getElementById( fullScreenElementId ) ){
                            fullScreenElement = document.getElementById( fullScreenElementId ) ;
                        }
                    }else{
                        fullScreenElement = fullScreenElementId ;
                    }
                }
                if( Utils.getFullscreenElement() && Utils.getFullscreenElement().id === fullScreenElement.id ){
                    whiteboardView.changeFullScreenState( true );
                }else{
                    whiteboardView.changeFullScreenState( false );
                }
            }else{
                whiteboardView.changeFullScreenState( false );
            }
        }
        if( this.videoPlayerView && this.videoPlayerView.receiveEventFullScreenChange ){
            this.videoPlayerView.receiveEventFullScreenChange( event );
        }
        return false ;
    }

    /*注册事件*/
    _registerEvent(){
		L.Logger.debug('[whiteboarrd-sdk]_registerEvent');
        /*处理兼容性，监听浏览器窗口是否课件（最小化）*/
        const _getVisibilityChangeCompatibility =  () => {
            let hidden, state, visibilityChange;
            if (typeof document.hidden !== "undefined") {
                hidden = "hidden";
                visibilityChange = "visibilitychange";
                state = "visibilityState";
            } else if (typeof document.mozHidden !== "undefined") {
                hidden = "mozHidden";
                visibilityChange = "mozvisibilitychange";
                state = "mozVisibilityState";
            } else if (typeof document.msHidden !== "undefined") {
                hidden = "msHidden";
                visibilityChange = "msvisibilitychange";
                state = "msVisibilityState";
            } else if (typeof document.webkitHidden !== "undefined") {
                hidden = "webkitHidden";
                visibilityChange = "webkitvisibilitychange";
                state = "webkitVisibilityState";
            }
            return {hidden, state, visibilityChange};
        };

        Utils.addEvent( window , 'resize' , this._windowResizeCallback.bind(this) );
        Utils.addEvent( window , 'message' , this._windowMessageCallback.bind(this) );
        Utils.addEvent( document , 'keydown' , this._documentKeydownCallback.bind(this) );
        Utils.addFullscreenchange( this._documentFullscreenchangeCallback.bind(this) );
        let {state, visibilityChange} = _getVisibilityChangeCompatibility();
        Utils.addEvent(document , visibilityChange, () => {
            if (document[state] === 'visible') {
                setTimeout(()=> {
                    this.updateAllWhiteboardSize();
                    return false ;
                },50);
            }
        }, false ); //监听浏览器窗口是否可见（最小化）
    };

    /*监听房间的事件*/
    _addRoomEvent(){
		L.Logger.debug('[whiteboarrd-sdk]_addRoomEvent');
        if( this.room ){
            if( this.room.removeBackupListerner ){
                this.room.removeBackupListerner( this.listernerBackupid );
            }
            this.room.addEventListener( 'room-receiveActionCommand' , this.reveiveEventRoomReceiveActionCommand.bind(this) , this.listernerBackupid );
            this.room.addEventListener( 'room-pubmsg' , this.receiveEventRoomPubmsg.bind(this) , this.listernerBackupid );
            this.room.addEventListener( 'room-delmsg' , this.receiveEventRoomDelmsg.bind(this) , this.listernerBackupid );
            this.room.addEventListener( 'room-connected' , this.receiveEventRoomConnected.bind(this) , this.listernerBackupid );
            this.room.addEventListener( 'room-disconnected' , this.receiveEventRoomDisconnected.bind(this) , this.listernerBackupid );
            this.room.addEventListener( 'room-msglist' , this.receiveEventRoomMsglist.bind(this) , this.listernerBackupid );
            this.room.addEventListener( 'room-usermediastate-changed' , this.reveiveEventRoomUsermediaorfilestateChanged.bind(this) , this.listernerBackupid );
            this.room.addEventListener( 'room-userfilestate-changed' , this.reveiveEventRoomUsermediaorfilestateChanged.bind(this) , this.listernerBackupid );
            this.room.addEventListener( 'room-usermediaattributes-update' , this.reveiveEventRoomUsermediaorfileattributesUpdate.bind(this) , this.listernerBackupid );
            this.room.addEventListener( 'room-userfileattributes-update' , this.reveiveEventRoomUsermediaorfileattributesUpdate.bind(this) , this.listernerBackupid );
            this.room.addEventListener('room-error-notice', this.receiveEventRoomErrorNotice.bind(this), this.listernerBackupid );
        }
    }

    /*转发流的相关事件*/
    _forwardingStreamEvents( handlerName , recvEventData){
		L.Logger.debug('[whiteboarrd-sdk]_forwardingStreamEvents handlerName and recvEventData:', handlerName , recvEventData);
        if( this.audioPlayerView &&  this.audioPlayerView[handlerName] && Utils.isFunction( this.audioPlayerView[handlerName] ) ){
            this.audioPlayerView[handlerName](recvEventData);
        }
        if( this.videoPlayerView &&  this.videoPlayerView[handlerName] && Utils.isFunction( this.videoPlayerView[handlerName] )  ){
            this.videoPlayerView[handlerName](recvEventData);
        }
    }

};

let filterTKWhiteBoardManagerInnerArr = [
    'createMainWhiteboard', 'destroyMainWhiteboard', 'createExtendWhiteboard', 'destroyExtendWhiteboard',
    'changeWhiteBoardConfigration', 'useWhiteboardTool', 'addPage', 'nextPage', 'prevPage', 'skipPage',
    'nextStep', 'prevStep', 'enlargeWhiteboard', 'narrowWhiteboard', 'clear', 'undo', 'redo', 'fullScreen',
    'exitFullScreen', 'resetWhiteboardData', 'updateWhiteboardSize', 'updateAllWhiteboardSize',
    'resetAllWhiteboardData', 'resetPureWhiteboardTotalPage', 'changeDynamicPptVolume', 'openDocumentRemark',
    'closeDocumentRemark', 'getWhiteboardIntermediateLayerInstance', 'changeCommonWhiteBoardConfigration',
    'registerRoomDelegate', 'changeDocument' , 'stopShareLocalMedia' ,'switchDocAddress' ,
] ;
let filterTKWhiteBoardManagerOuterArr = [
    'createMainWhiteboard', 'destroyMainWhiteboard', 'changeDocument', 'changeWhiteBoardConfigration',
    'useWhiteboardTool', 'addPage', 'nextPage', 'prevPage', 'skipPage', 'nextStep', 'prevStep',
    'enlargeWhiteboard', 'narrowWhiteboard', 'clear', 'undo', 'redo', 'fullScreen', 'exitFullScreen',
    'resetWhiteboardData','registerRoomDelegate','changeCommonWhiteBoardConfigration',
] ;

function TKWhiteBoardManager(room , sdkReceiveActionCommand,  isInner ) {
    let that = {};
    that.className = 'TKWhiteBoardManager' ; //类的名字

    let TKWhiteBoard = new TKWhiteBoardManagerInner(room , sdkReceiveActionCommand, isInner);
    let filterTKWhiteBoardManager = isInner?filterTKWhiteBoardManagerInnerArr:filterTKWhiteBoardManagerOuterArr;
    for(let methodName of filterTKWhiteBoardManager){
        that[methodName] = (...args) => {
            return TKWhiteBoard[methodName](...args);
        }
    }
    return that ;
}

window.TKWhiteBoardManager = TKWhiteBoardManager ;
export { TKWhiteBoardManager };
export default TKWhiteBoardManager ;