/* 课件备注视图
 * @module remarkViewRootElement
 * @description  sdk课件备注
 * @author 邱广生
 * @date 2018-05-20
  * */


'use strict';
import TalkcloudReact from '../components/TalkcloudReact';
import DomUtils from '../../utils/DomUtils';
import Utils from '../../utils/Utils';
import Global from '../../utils/Global';
import TalkLanguage from '../../utils/Language';
import TalkAjax from '../../utils/TalkAjax';

class TalkDocumentRemark extends TalkcloudReact{
    constructor( parentNode  = document.body , instanceId = 'default', whiteBoardManagerInstance ,  props = {} , configration = {} ){
        super(props);
        this.parentNode = parentNode ;
        this.instanceId = instanceId ;
        this.whiteBoardManagerInstance = whiteBoardManagerInstance ;
        this.configration = configration ;
        this.elements = {};
        this.documentRemarkTalkDrag = undefined ; //拖拽实例
        this.ajaxRequestingList = {} ; //ajax正在请求的列表
        this.state = {
            autoOpenRemark:true , //是否自动打开remark
            updateState:false ,
            viewState: {
                tool: {}, //白板标注工具信息
                action: {}, //撤销、恢复、清空信息
                zoom: {}, //方法缩小信息
                page: {},  //翻页信息
                documentType: 'generalDocument', //打开的文件类别，generalDocument（普通文档）、dynamicPPT（动态PPT）、h5Document(H5课件)
                fileid: 0, //打开的文档的文件id
                dynamicPptVolume: 100, //动态PPT文档的音量
                fullScreen: false, //是否全屏
                remark: false, //是否开启文档备注
                other: { //其它信息
                    primaryColor: this.configration.primaryColor ,  //画笔颜色 ,默认 #000000
                    secondaryColor:this.configration.secondaryColor ,  //填充颜色 ,默认 #ffffff
                    backgroundColor:this.configration.backgroundColor ,   //背景颜色 ,默认 #ffffff
                    pencilWidth:this.configration.pencilWidth , //画笔大小 , 默认5
                    shapeWidth:this.configration.shapeWidth, //图形画笔大小 , 默认5
                    eraserWidth:this.configration.eraserWidth, //橡皮大小 ， 默认15
                    fontSize:this.configration.fontSize , //字体大小 ， 默认18
                    fontFamily:this.configration.fontFamily , //使用的字体 ，默认"微软雅黑"
                }
            },
        };
        this._createConnectElements();
        this._updateLanguage();
        this.render();
    }

    componentDidUpdateState( prevState ){
        if( this.state.autoOpenRemark && prevState.viewState.fileid === this.state.viewState.fileid && this.state.viewState.fileid != 0 && prevState.viewState.page.currentPage !== this.state.viewState.page.currentPage ){
            if( this.whiteBoardManagerInstance && Utils.isFunction( this.whiteBoardManagerInstance.openDocumentRemark ) ){
                this.whiteBoardManagerInstance.openDocumentRemark();
            }
        }
        if(prevState.viewState.fileid !== this.state.viewState.fileid ){
            if( this.state.autoOpenRemark && this.state.viewState.fileid != 0 ){
                if( this.whiteBoardManagerInstance && Utils.isFunction( this.whiteBoardManagerInstance.openDocumentRemark ) ){
                    this.whiteBoardManagerInstance.openDocumentRemark();
                }
            }
            this._ajaxDocumentRemark();
        }
        if(prevState.viewState.remark !== this.state.viewState.remark ){
            this._ajaxDocumentRemark();
        }
    };


    componentDidUpdateProps( prevProps ){
        if( prevProps.languageType !== this.props.languageType ){
            this._updateLanguage();
        }
        if( prevProps.isDrag !== this.props.isDrag ){
            if( this.props.isDrag  ){
                this._addTalkDrag() ;
            }else{
                if( this.documentRemarkTalkDrag && typeof this.documentRemarkTalkDrag.destroy === 'function' ){
                    this.documentRemarkTalkDrag.destroy();
                    this.documentRemarkTalkDrag = undefined ;
                }
            }
        }
        if(  !Utils.deepCompareJson( prevProps.initDragPosition , this.props.initDragPosition  )  ){
            if( this.documentRemarkTalkDrag && typeof this.documentRemarkTalkDrag.setPosition === 'function' ){
                let { left = 50 , top = 100 } = this.props.initDragPosition || {} ;
                this.documentRemarkTalkDrag.setPosition(left , top) ;
            }
        }
    };


    /*改变父亲节点*/
    changeParentNode( parentNode ){
        if( parentNode ){
            DomUtils.removeChild( this.elements.remarkViewRootElement  , this.parentNode );
            this.parentNode = parentNode ;
            DomUtils.appendChild( this.parentNode , this.elements.remarkViewRootElement );
        }
    }

    /*销毁视图*/
    destroyView(){
        DomUtils.removeChild(this.elements.remarkViewRootElement , this.parentNode );
        for(let key in this.elements){
            this.elements[key] = undefined ;
            delete this.elements[key] ;
        }
    }

    /*重新计算大小*/
    resize(){
        if( this.documentRemarkTalkDrag && Utils.isFunction( this.documentRemarkTalkDrag.resizeCallback ) ){
            this.documentRemarkTalkDrag.resizeCallback();
        }
    }

    /*接收动作指令*/
    receiveActionCommand(action , cmd){
        if( typeof cmd === 'object' && !Array.isArray(cmd) ){
            cmd = Object.deepAssign({} , cmd);
        }
        L.Logger.debug( '[DocumentRemark]receive whiteboard view action command（action,cmd）:' , action , cmd );
        switch (action){
            case 'viewStateUpdate':
                this.setState({
                    viewState: cmd.viewState
                });
                break;
        }
    }

    /*关闭文档备注*/
    closeDocumentRemarkOnClick(){
        if( this.whiteBoardManagerInstance && Utils.isFunction( this.whiteBoardManagerInstance.closeDocumentRemark ) ){
            this.whiteBoardManagerInstance.closeDocumentRemark();
        }
    }

    /*创建所需节点*/
    _createConnectElements(){
        this.elements.remarkViewRootElement = DomUtils.createElement('div' , this.instanceId+'TalkcloudRemark' ,   'talkcloud-sdk-whiteboard '+ this.instanceId+' talk-cloud-remark-container remark-container' , {
            position:'absolute' ,
            left:0 ,
            top:0 ,
            display:'none' ,
            zIndex:3 ,
        }); //h5容器节点

        this.elements.remarkViewRootElement.innerHTML = `
            <div class="remark-head"> 
                <span class="name"></span>
                <button class="close"></button>
            </div>
            <div class="content-container"> 
                <span class="content-text  custom-scroll-bar" >  </span>
            </div>
        `;

        DomUtils.appendChild( this.parentNode  , this.elements.remarkViewRootElement );

        this.elements.remarkNameElement = this.elements.remarkViewRootElement.getElementsByClassName('name')[0];
        this.elements.remarkCloseElement = this.elements.remarkViewRootElement.getElementsByClassName('close')[0];
        this.elements.remarkContentElement = this.elements.remarkViewRootElement.getElementsByClassName('content-text')[0];

        this.elements.remarkCloseElement.onclick = this.closeDocumentRemarkOnClick.bind(this) ;

        this._addTalkDrag();
    }

    /*更新语言*/
    _updateLanguage(){
        let { languageType = 'ch' } = this.props ;
        if( !( languageType === 'ch' || languageType === 'tw' || languageType === 'en')  ){
            languageType = 'ch' ;
        }
        let { name , closeTitle } = TalkLanguage.get( languageType ).documentRemark ;
        this.elements.remarkNameElement.innerHTML = name;
        this.elements.remarkCloseElement.setAttribute('title' ,  closeTitle ) ;
    }

    /*添加拖拽*/
    _addTalkDrag(){
        if( window.TalkDrag && this.elements.remarkViewRootElement ){
            if( this.documentRemarkTalkDrag && typeof this.documentRemarkTalkDrag.destroy === 'function' ){
                this.documentRemarkTalkDrag.destroy();
                this.documentRemarkTalkDrag = undefined ;
            }
            this.documentRemarkTalkDrag =  new window.TalkDrag( this.elements.remarkViewRootElement , {
                containerData:{
                    left:50 ,
                    top:90
                }
            });
        }
    }


    /*ajax请求文档备注信息*/
    _ajaxDocumentRemark(){
        let { remark , fileid  } = this.state.viewState ;
        let isRequesting = false ;
        if( this.ajaxRequestingList[ 'documentRemark_'+fileid ] &&  new Date().getTime() - this.ajaxRequestingList[ 'documentRemark_'+fileid ].requestTime  < 5000 ){
            isRequesting = true ;
        }
        if( this.props.isConnectedRoom && !isRequesting && this.props.canRemark &&  remark && fileid != 0 &&  !Global.allDocumentRemarkInfoMap.has( 'documentRemark_'+fileid ) ){ //开启课件备注且之前没有获取过该备注数据
            if( this.ajaxRequestingList[ 'documentRemark_'+fileid ] &&  this.ajaxRequestingList[ 'documentRemark_'+fileid ].ajaxXhr && Utils.isFunction( this.ajaxRequestingList[ 'documentRemark_'+fileid ].ajaxXhr.abort ) ){
                this.ajaxRequestingList[ 'documentRemark_'+fileid ].ajaxXhr.abort() ;
            }
            this.ajaxRequestingList[ 'documentRemark_'+fileid ] = { requestTime:new Date().getTime() , ajaxXhr:undefined } ;
            this.ajaxRequestingList[ 'documentRemark_'+fileid ].ajaxXhr = TalkAjax().post( this.props.webAddress + "/ClientAPI" + "/getfileremark"+"?ts="+new Date().getTime() , { fileid: fileid })
                .then( (response) => {
                    this.ajaxRequestingList[ 'documentRemark_'+fileid ] = undefined ;
                    delete this.ajaxRequestingList[ 'documentRemark_'+fileid ] ;
                    if( response && response.result === 0 ){
                        for( let key in response ){
                            var remarkInfo = response[key] ;
                            if( key !== 'result' &&  remarkInfo && Utils.isJson( remarkInfo ) ){
                                if( !Global.allDocumentRemarkInfoMap.has('documentRemark_'+remarkInfo.fileid) ){
                                    Global.allDocumentRemarkInfoMap.set('documentRemark_'+remarkInfo.fileid , {} );
                                }
                                let documentRemarkInfoJson = Global.allDocumentRemarkInfoMap.get('documentRemark_'+remarkInfo.fileid) ;
                                if( documentRemarkInfoJson ){
                                    documentRemarkInfoJson[remarkInfo.fileid+'_'+remarkInfo.pageid] = remarkInfo.remark ;
                                }
                                if( this.whiteBoardManagerInstance && this.whiteBoardManagerInstance.whiteboardViewMap && this.whiteBoardManagerInstance.whiteboardViewMap.get('default')
                                    && Utils.isFunction( this.whiteBoardManagerInstance.whiteboardViewMap.get('default').forceViewStateUpdate ) ){
                                    this.whiteBoardManagerInstance.whiteboardViewMap.get('default').forceViewStateUpdate();
                                }
                            }
                        }
                    }
                    this.setState({updateState:!this.state.updateState});
                })
                .catch( (response, xhr) => {
                    L.Logger.error('ajax request fail  error info( response, xhr ):' , response , xhr);
                    this.ajaxRequestingList[ 'documentRemark_'+fileid ] = undefined ;
                    delete this.ajaxRequestingList[ 'documentRemark_'+fileid ] ;
                    this.setState({updateState:!this.state.updateState});
                });
        }
    }

    render(){
        let { remark , fileid , page = {}  } = this.state.viewState ;
        let { currentPage = 1 } = page ;
        let documentRemarkInfoJson = Global.allDocumentRemarkInfoMap.get('documentRemark_'+fileid) ;
        let isShow = this.props.canRemark && remark && fileid != 0 && documentRemarkInfoJson && documentRemarkInfoJson[fileid+'_'+currentPage] ;
        let isNendResize = !this.isShow && isShow  ;
        this.isShow = isShow ;
        DomUtils.updateStyle( this.elements.remarkViewRootElement , {
           display:isShow ? 'block' : 'none'
        });

        if( isShow && documentRemarkInfoJson && documentRemarkInfoJson[fileid+'_'+currentPage] ){
            this.elements.remarkContentElement.innerHTML = documentRemarkInfoJson[fileid+'_'+currentPage] ;
        }

        if( isNendResize && this.documentRemarkTalkDrag && Utils.isFunction( this.documentRemarkTalkDrag.resizeCallback  ) ){
            this.documentRemarkTalkDrag.resizeCallback();
        }

    }

}

window.TalkDocumentRemark = TalkDocumentRemark ;
export {TalkDocumentRemark} ;
export default TalkDocumentRemark ;