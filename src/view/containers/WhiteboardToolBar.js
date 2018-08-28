/* 白板标注工具条
 * @module WhiteboardToolBar
 * @description  sdk白板标注工具条
 * @author 邱广生
 * @date 2018-05-06
  * */


'use strict';
import TalkcloudReact from '../components/TalkcloudReact';
import DomUtils from '../../utils/DomUtils';
import Utils from '../../utils/Utils';
import TalkLanguage from '../../utils/Language';

class TalkWhiteboardToolbar extends TalkcloudReact{
    constructor( parentNode  = document.body , instanceId = 'default', whiteBoardManagerInstance ,  props = {} , configration = {} ){
        super(props);
        this.parentNode = parentNode ;
        this.instanceId = instanceId ;
        this.whiteBoardManagerInstance = whiteBoardManagerInstance ;
        this.configration = configration ;
        this.elements = {};
        this.whiteboardToolbarTalkDrag = undefined ; //拖拽实例
        this.state = {
            tempDisabledDrag:false , //是否临时禁用拖拽
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
            useColor:'' ,
        };
        this.fileTypeMark = 'general' ; //general 、 dynamicPPT 、 h5document
        this._createConnectElements();
        this._addEvent();
        this._updateLanguage();
        this.render();
    }

    componentDidUpdateState( prevState ){
        if( prevState.tempDisabledDrag !== this.state.tempDisabledDrag ){
            if( this.whiteboardToolbarTalkDrag && typeof this.whiteboardToolbarTalkDrag.updateDisabled ){
                this.whiteboardToolbarTalkDrag.updateDisabled( this.state.tempDisabledDrag );
            }
        }
        if(  prevState.viewState.other.pencilWidth !== this.state.viewState.other.pencilWidth ){
            this._setPencilWidthToSlider();
        }

        if(  prevState.viewState.other.eraserWidth !== this.state.viewState.other.eraserWidth ){
            this._setEraserWidthToSlider();
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
                if( this.whiteboardToolbarTalkDrag && typeof this.whiteboardToolbarTalkDrag.destroy === 'function' ){
                    this.whiteboardToolbarTalkDrag.destroy();
                    this.whiteboardToolbarTalkDrag = undefined ;
                }
            }
        }
        if(  !Utils.deepCompareJson( prevProps.initDragPosition , this.props.initDragPosition  )  ){
            if( this.whiteboardToolbarTalkDrag && typeof this.whiteboardToolbarTalkDrag.setPosition === 'function' ){
                let { left = 0 , top = 0 } = this.props.initDragPosition || {} ;
                this.whiteboardToolbarTalkDrag.setPosition(left , top) ;
            }
        }

        if( this.elements && ( !Utils.deepCompareJson( prevProps.loadWhiteboardTools , this.props.loadWhiteboardTools ) || (prevProps.isMobile !== this.props.isMobile) )  ){
            let { mouse , laser , pen , text , shape , eraser , clear , undo , redo , setting } = this.props.loadWhiteboardTools || {} ;
            DomUtils.updateStyle( this.elements.tool_mouse , {
                display:!mouse?'none':''
            });
            DomUtils.updateStyle( this.elements.tool_laser , {
                display:(!laser  || this.props.isMobile )?'none':''
            });
            DomUtils.updateStyle( this.elements.penList , {
                display:!pen?'none':''
            });
            DomUtils.updateStyle( this.elements.tool_text , {
                display:!text?'none':''
            });
            DomUtils.updateStyle( this.elements.shapeList , {
                display:!shape?'none':''
            });
            DomUtils.updateStyle( this.elements.tool_eraser , {
                display:!eraser?'none':''
            });
            DomUtils.updateStyle( this.elements.action_clear , {
                display:!clear?'none':''
            });
            DomUtils.updateStyle( this.elements.action_undo , {
                display:!undo?'none':''
            });
            DomUtils.updateStyle( this.elements.action_redo , {
                display:!redo?'none':''
            });
            DomUtils.updateStyle( this.elements.settingList , {
                display:!setting?'none':''
            });
        }

        if(  prevProps.pencilWidthScale !== this.props.pencilWidthScale ){
            this._setPencilWidthToSlider();
        }

        if(  prevProps.eraserWidthScale !== this.props.eraserWidthScale ){
            this._setEraserWidthToSlider();
        }

    };

    /*改变父亲节点*/
    changeParentNode( parentNode ){
        if( parentNode ){
            DomUtils.removeChild( this.elements.whiteboardToolbarViewRootElement , this.parentNode );
            this.parentNode = parentNode ;
            DomUtils.appendChild( this.parentNode , this.elements.whiteboardToolbarViewRootElement );
        }
    }

    /*销毁视图*/
    destroyView(){
        DomUtils.removeChild(this.elements.whiteboardToolbarViewRootElement , this.parentNode );
        for(let key in this.elements){
            this.elements[key] = undefined ;
            delete this.elements[key] ;
        }
    }

    /*接收动作指令*/
    receiveActionCommand(action , cmd){
        if( typeof cmd === 'object' && !Array.isArray(cmd) ){
            cmd = Object.deepAssign({} , cmd);
        }
        L.Logger.debug( '[WhiteboardToolbar]receive whiteboard view action command（action,cmd）:' , action , cmd );
        switch (action){
            case 'closeAllSelectBox':
                this._closeList();
                break;
            case 'viewStateUpdate':
                this.setState({
                    viewState: cmd.viewState
                });
                break;
        }
    }

    /*鼠标离开白板标注工具容器*/
    whiteboardToolbarViewRootMouseLeave(event){
        this._closeList();
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        return false;
    }

    /*列表的打开和关闭*/
    listOpenOrCloseOnClick( elementKey , event){
        if( this.elements[elementKey] ){
            this._closeList( elementKey );
            if( DomUtils.hasClass( this.elements[elementKey] ,  'open' ) ){
                DomUtils.removeClass( this.elements[elementKey] ,  'open' ) ;
                DomUtils.removeClass( this.elements[elementKey] ,  'left-show-list' ) ;
            }else{
                DomUtils.addClass( this.elements[elementKey] ,  'open' ) ;
                let toolKey = undefined ;
                let listParemtElementRect = undefined ;
                switch (elementKey){
                    case 'penList':
                        toolKey = this.elements.penList.getAttribute('data-current-pen') ;
                        if( toolKey && this.whiteBoardManagerInstance ){
                            this.whiteBoardManagerInstance.useWhiteboardTool(  toolKey , this.instanceId );
                        }
                        listParemtElementRect = this._getRect( this.elements.penListExtend ) ;
                        break;
                    case 'shapeList':
                        toolKey = this.elements.shapeList.getAttribute('data-current-shape') ;
                        if( toolKey && this.whiteBoardManagerInstance ){
                            this.whiteBoardManagerInstance.useWhiteboardTool(  toolKey , this.instanceId );
                        }
                        listParemtElementRect = this._getRect( this.elements.shapeListExtend ) ;
                        break;
                    case 'settingList':
                        listParemtElementRect = this._getRect( this.elements.settingListExtend ) ;
                        break;
                }
                if( listParemtElementRect ){
                    let elementRect = this._getRect( this.elements.whiteboardToolbarViewRootElement ) ;
                    let paremtElementRect = this._getRect( this.parentNode ) ;
                    if( elementRect.left - paremtElementRect.left > ( paremtElementRect.width - ( elementRect.width + listParemtElementRect.width + 5 ) ) ){
                        DomUtils.addClass( this.elements[elementKey] ,  'left-show-list' ) ;
                    }else{
                        DomUtils.removeClass( this.elements[elementKey] ,  'left-show-list' ) ;
                    }
                }
            }
        }
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        return false;
    }

    /*鼠标离开列表项关闭*/
    listOpenOrCloseOnMouseLeave( elementKey , event ){
        if( this.elements[elementKey] ){
            DomUtils.removeClass( this.elements[elementKey] ,  'open' ) ;
        }
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        return false;
    }

    /*使用标注工具*/
    useWhiteboardToolOnClick(toolKey , event){
        if( this.whiteBoardManagerInstance && toolKey ){
            /*switch ( toolKey ){
                case 'tool_pencil':
                case 'tool_highlighter':
                case 'tool_line':
                case 'tool_arrow':
                    this.elements.penList.setAttribute('data-current-pen' , toolKey);
                    break;
                case 'tool_rectangle':
                case 'tool_rectangle_empty':
                case 'tool_ellipse_empty':
                case 'tool_ellipse':
                    this.elements.shapeList.setAttribute('data-current-shape' , toolKey);
                    break;
            }*/
            this.whiteBoardManagerInstance.useWhiteboardTool(  toolKey , this.instanceId );
        }
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        return false ;
    }

    /*执行白板的动作*/
    executeWhiteboardAction( actionKey , event){
        if( this.whiteBoardManagerInstance ){
            this.whiteBoardManagerInstance.executeWhiteboardAction(  actionKey , this.instanceId );
        }
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        return false ;
    };

    /*改变画笔颜色*/
    changeColorOnClick( colorValue , event){
        this._changeWhiteBoardConfigration( 'primaryColor' , colorValue);
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        return false ;
    }

    /*改变字体*/
    changeFontFamilyOnClick( fontFamilyValue ,  fontFamilyKey , event ){
        this._changeWhiteBoardConfigration( 'fontFamily' , fontFamilyValue);
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        return false ;
    }

    /*改变字号*/
    changeFontSizeOnClick( fontSize  , event){
        this._changeWhiteBoardConfigration( 'fontSize' , fontSize);
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        return false ;
    }

    /*发送动作指令
     * XXX 此处直接获取了主白板实例且直接操作了主白板的方法*/
    sendActionCommand( action , cmd ){
        if( this.whiteBoardManagerInstance && this.whiteBoardManagerInstance.whiteboardViewMap
            && this.whiteBoardManagerInstance.whiteboardViewMap.has('default') ){
            let whiteboardView = this.whiteBoardManagerInstance.whiteboardViewMap.get( 'default' ) ;
            if( whiteboardView && whiteboardView.sendActionCommand ){
                whiteboardView.sendActionCommand( action , cmd );
            }
        }
    };

    /*重新计算大小*/
    resize(){
        if( this.whiteboardToolbarTalkDrag && Utils.isFunction( this.whiteboardToolbarTalkDrag.resizeCallback ) ){
            this.whiteboardToolbarTalkDrag.resizeCallback();
        }
    }

    /*获取节点的位置信息*/
    _getRect ( element ){
        let rect = element.getBoundingClientRect();
        let clientTop = document.documentElement.clientTop;
        let clientLeft = document.documentElement.clientLeft;
        return { // 兼容ie多出的两个px
            top : rect.top - clientTop, // 距离顶部的位置
            bottom : rect.bottom - clientTop, // 距离顶部加上元素本身的高度就等于bottom的位置
            left : rect.left - clientLeft, // 距离左边的位置
            right : rect.right - clientLeft , // 距离右边的位置就是 距离左边的位置加上元素本身的宽度
            width:rect.width , //元素宽度
            height:rect.height , //元素高度
        };
    };

    /*创建并连接节点*/
    _createConnectElements(){
        let that = this ;
        let { mouse , laser , pen , text , shape , eraser , clear , undo , redo , setting } = this.props.loadWhiteboardTools || {} ;
        this.elements.whiteboardToolbarViewRootElement = DomUtils.createElement('article' , this.instanceId+'WhiteboardToolViewRoot' , 'talkcloud-sdk-whiteboard '+ this.instanceId+' whiteboard-toolbar-root' , {
            zIndex:6 ,
        }); //白板标注工具根节点
        DomUtils.appendChild( this.parentNode , this.elements.whiteboardToolbarViewRootElement );
        this.elements.whiteboardToolbarViewRootElement.innerHTML = `
            <ul class="whiteboard-tool-list-container" > 
                <li class="tool-option tool_mouse"  style="display:${!mouse?'none':''}" >
                    <em class="icon"></em>
                </li>
                <li class="tool-option tool_laser" style="display:${(!laser || this.props.isMobile)?'none':''}" >
                    <em class="icon"></em>
                </li>
                <li class="tool-option pen-list"  data-current-pen='tool_pencil' style="display:${!pen?'none':''}" > 
                    <em class="icon"></em>
                    <div class="tool-pen-list-extend" >
                         <ol class="tool-pen-container" > 
                             <em class="arrow" ></em>
                            <li class="pen-option tool_pencil" >
                                <em class="pen-icon "></em>
                            </li>
                            <li class="pen-option tool_highlighter" >
                                <em class="pen-icon"></em>
                            </li>
                            <li class="pen-option tool_line" >
                                 <em class="pen-icon"></em>
                            </li>
                            <li class="pen-option tool_arrow" >
                                 <em class="pen-icon"></em>
                            </li>
                        </ol>
                    </div>                
                </li>
                <li class="tool-option tool_text" style="display:${!text?'none':''}" >
                    <em class="icon"></em>
                </li>
                <li class="tool-option shape-list" data-current-shape='tool_rectangle_empty'  style="display:${!shape?'none':''}"  > 
                    <em class="icon"></em>
                     <div class="tool-shape-list-extend" >
                         <ol class="tool-shape-container" > 
                            <em class="arrow" ></em>
                            <li class="shape-option tool_rectangle_empty" >
                                <em class="shape-icon"></em>
                            </li>
                            <li class="shape-option tool_rectangle" >
                                <em class="shape-icon"></em>
                            </li>
                            <li class="shape-option tool_ellipse_empty" >
                                <em class="shape-icon"></em>
                            </li>
                            <li class="shape-option tool_ellipse" >
                                <em class="shape-icon"></em>
                            </li>
                        </ol>
                     </div>
                </li>
                <li class="tool-option tool_eraser"  style="display:${!eraser?'none':''}" >
                    <em class="icon"></em>
                </li>
                <li class="tool-option tool_undo" style="display:${!undo?'none':''}"  >
                    <em class="icon"></em>
                </li>
                <li class="tool-option tool_redo" style="display:${!redo?'none':''}" >
                    <em class="icon"></em>
                </li>
                <li class="tool-option tool_clear" style="display:${!clear?'none':''}"  >
                    <em class="icon"></em>
                </li>
                <li class="tool-option setting-list" style="display:${!setting?'none':''}" > 
                    <em class="icon"></em>
                    <div class="setting-list-extend" title=""  >
                        <div class="setting-container" > 
                            <em class="arrow" ></em>
                            <div class="colors-container" >                         
                            </div>
                            <div class="font-container">
                                <span class="font-title title"></span>
                                <div class="font-content-container" > 
                                    <div class="font-family-container"> 
                                    </div>
                                    <div class="font-size-container" >
                                    </div>
                                </div>
                            </div>
                            <div class="pencil-width-container" >
                                <span class="pencil-width-title title"  ></span>
                                <div class="slider-container pencil-slider-container" id="${this.instanceId}PencilWidthSlider" ></div>
                            </div> 
                            <div class="eraser-width-container" >
                                <span class="eraser-width-title title"></span>
                                <div class="slider-container eraser-slider-container"  id="${this.instanceId}EraserWidthSlider" ></div>
                            </div> 
                        </div>
                    </div>
                  
                </li>
            </ul>
        `;



        this.elements.tool_mouse = document.getElementById(this.instanceId+'WhiteboardToolViewRoot').getElementsByClassName('tool_mouse')[0] ;
        this.elements.tool_laser = document.getElementById(this.instanceId+'WhiteboardToolViewRoot').getElementsByClassName('tool_laser')[0] ;
        this.elements.tool_text = document.getElementById(this.instanceId+'WhiteboardToolViewRoot').getElementsByClassName('tool_text')[0] ;
        this.elements.tool_eraser = document.getElementById(this.instanceId+'WhiteboardToolViewRoot').getElementsByClassName('tool_eraser')[0] ;
        this.elements.tool_pencil = document.getElementById(this.instanceId+'WhiteboardToolViewRoot').getElementsByClassName('tool_pencil')[0] ;
        this.elements.tool_highlighter = document.getElementById(this.instanceId+'WhiteboardToolViewRoot').getElementsByClassName('tool_highlighter')[0] ;
        this.elements.tool_line = document.getElementById(this.instanceId+'WhiteboardToolViewRoot').getElementsByClassName('tool_line')[0] ;
        this.elements.tool_arrow = document.getElementById(this.instanceId+'WhiteboardToolViewRoot').getElementsByClassName('tool_arrow')[0] ;
        this.elements.tool_ellipse = document.getElementById(this.instanceId+'WhiteboardToolViewRoot').getElementsByClassName('tool_ellipse')[0] ;
        this.elements.tool_ellipse_empty = document.getElementById(this.instanceId+'WhiteboardToolViewRoot').getElementsByClassName('tool_ellipse_empty')[0] ;
        this.elements.tool_rectangle = document.getElementById(this.instanceId+'WhiteboardToolViewRoot').getElementsByClassName('tool_rectangle')[0] ;
        this.elements.tool_rectangle_empty = document.getElementById(this.instanceId+'WhiteboardToolViewRoot').getElementsByClassName('tool_rectangle_empty')[0] ;

        this.elements.action_undo = document.getElementById(this.instanceId+'WhiteboardToolViewRoot').getElementsByClassName('tool_undo')[0] ;
        this.elements.action_redo = document.getElementById(this.instanceId+'WhiteboardToolViewRoot').getElementsByClassName('tool_redo')[0] ;
        this.elements.action_clear = document.getElementById(this.instanceId+'WhiteboardToolViewRoot').getElementsByClassName('tool_clear')[0] ;

        this.elements.penList = document.getElementById(this.instanceId+'WhiteboardToolViewRoot').getElementsByClassName('pen-list')[0] ;
        this.elements.shapeList = document.getElementById(this.instanceId+'WhiteboardToolViewRoot').getElementsByClassName('shape-list')[0] ;
        this.elements.settingList = document.getElementById(this.instanceId+'WhiteboardToolViewRoot').getElementsByClassName('setting-list')[0] ;
        this.elements.penListExtend = document.getElementById(this.instanceId+'WhiteboardToolViewRoot').getElementsByClassName('tool-pen-list-extend')[0] ;
        this.elements.shapeListExtend = document.getElementById(this.instanceId+'WhiteboardToolViewRoot').getElementsByClassName('tool-shape-list-extend')[0] ;
        this.elements.settingListExtend = document.getElementById(this.instanceId+'WhiteboardToolViewRoot').getElementsByClassName('setting-list-extend')[0] ;

        this.elements.colorsContainer = document.getElementById(this.instanceId+'WhiteboardToolViewRoot').getElementsByClassName('colors-container')[0] ;
        this.elements.fontTitle = document.getElementById(this.instanceId+'WhiteboardToolViewRoot').getElementsByClassName('font-title')[0] ;
        this.elements.fontFamilyContainer = document.getElementById(this.instanceId+'WhiteboardToolViewRoot').getElementsByClassName('font-family-container')[0] ;
        this.elements.fontSizeContainer = document.getElementById(this.instanceId+'WhiteboardToolViewRoot').getElementsByClassName('font-size-container')[0] ;
        this.elements.pencilWidthTitle = document.getElementById(this.instanceId+'WhiteboardToolViewRoot').getElementsByClassName('pencil-width-title')[0] ;
        this.elements.eraserWidthTitle = document.getElementById(this.instanceId+'WhiteboardToolViewRoot').getElementsByClassName('eraser-width-title')[0] ;

        if( window.TalkSlider ){
            this.pencilWidthSlider =  new window.TalkSlider({
                sliderContainer:{//slider整个组件容器的的设置
                    id:that.instanceId+'PencilWidthSlider',//必传!!!!
                    direction:'horizontal'//方向（水平(默认：horizontal||垂直：vertikal）
                },
                onChange:function ( value ) {
                    if( that.instanceId === 'default' ){
                        let { pencilWidthScale = 1  } = that.props ;
                        that.sendActionCommand( 'pencilWidthChange'  , {
                            pencilWidthPercentage:value ,
                            pencilWidth:value * pencilWidthScale
                        });
                    }
                },
                onAfterChange:function(value){//拖拽音量条获取的音量值
                    value = value < 1 ? 1 : value ;
                    let { pencilWidthScale = 1  } = that.props ;
                    that._changeWhiteBoardConfigration('pencilWidth' , value * pencilWidthScale );
                    that._changeWhiteBoardConfigration('shapeWidth' , value * pencilWidthScale );
                    if( that.instanceId === 'default' ){
                        that.sendActionCommand( 'pencilWidthChange'  , {
                            pencilWidthPercentage:value ,
                            pencilWidth:value * pencilWidthScale
                        });
                    }
                }
            });
            this.eraserWidthSlider = new window.TalkSlider({
                sliderContainer:{//slider整个组件容器的的设置
                    id:that.instanceId+'EraserWidthSlider',//必传!!!!
                    direction:'horizontal'//方向（水平(默认：horizontal||垂直：vertikal）
                },
                onChange:function ( value ) {
                    if( that.instanceId === 'default' ){
                        let { eraserWidthScale = 1  } = that.props ;
                        that.sendActionCommand( 'eraserWidthChange'  , {
                            eraserWidth:value * eraserWidthScale ,
                            eraserWidthPercentage:value / 100 ,
                        });
                    }
                },
                onAfterChange:function(value){//拖拽音量条获取的音量值
                    value = value < 1 ? 1 : value ;
                    let { eraserWidthScale = 1  } = that.props ;
                    that._changeWhiteBoardConfigration('eraserWidth' , value * eraserWidthScale );
                    if( that.instanceId === 'default' ){
                        that.sendActionCommand( 'eraserWidthChange'  , {
                            eraserWidth:value * eraserWidthScale ,
                            eraserWidthPercentage:value  / 100 ,
                        });
                    }
                }
            });
            this._setPencilWidthToSlider();
            this._setEraserWidthToSlider();
        }

        this._addTalkDrag();

    };

    /*添加拖拽*/
    _addTalkDrag(){
        if( this.props.isDrag && window.TalkDrag && this.elements.whiteboardToolbarViewRootElement ){
            if( this.whiteboardToolbarTalkDrag && typeof this.whiteboardToolbarTalkDrag.destroy === 'function' ){
                this.whiteboardToolbarTalkDrag.destroy();
                this.whiteboardToolbarTalkDrag = undefined ;
            }
            let { left = 0 , top = 0 } = this.props.initDragPosition || {} ;
            this.whiteboardToolbarTalkDrag =  new window.TalkDrag( this.elements.whiteboardToolbarViewRootElement , {
                containerData:{
                    left:left ,
                    top:top
                }
            });
        }
    }

    /*更新语言*/
    _updateLanguage(){
        let { languageType = 'ch' } = this.props ;
        if( !( languageType === 'ch' || languageType === 'tw' || languageType === 'en')  ){
            languageType = 'ch' ;
        }
        let {  fontSizeText , fontFamily = {} , pencilWidthTitle , eraserWidthTitle , toolTextList = {} } = TalkLanguage.get( languageType ).whiteboardToolbar ;
        let { title , options = {} } = fontFamily ;
        this.elements.fontTitle.innerHTML = title ;
        this.elements.pencilWidthTitle.innerHTML = pencilWidthTitle ;
        this.elements.eraserWidthTitle.innerHTML = eraserWidthTitle ;
        DomUtils.removeAllChild( this.elements.fontFamilyContainer );
        for( let [key , value] of Object.entries(options) ){
            let button = DomUtils.createElement('button' , undefined , "font-family-option "+key );
            button.innerHTML = value ;
            button.setAttribute('data-font-family-key' , key );
            button.setAttribute('data-font-family-value' , value );
            button.onclick = this.changeFontFamilyOnClick.bind(this , value , key );
            DomUtils.appendChild( this.elements.fontFamilyContainer , button );
        }

        DomUtils.removeAllChild( this.elements.fontSizeContainer );
        let fontSizeArray = [ 12 , 14 , 18 , 24 , 26 , 36 , 48 , 72 ] ;
        let num = 0 ;
        let spanElement = undefined ;
        for( let fontSize of fontSizeArray ){
            let button = DomUtils.createElement('button' , undefined , "font-size-option font-size-"+fontSize );
            button.innerHTML =fontSize+ fontSizeText;
            button.setAttribute('data-font-size' , fontSize);
            button.onclick = this.changeFontSizeOnClick.bind(this ,fontSize );
            if( num > 2 ){
                num = 0 ;
            }
            if( num === 0 ){
                spanElement = DomUtils.createElement('span' , undefined , "font-size-list" );
                DomUtils.appendChild( this.elements.fontSizeContainer , spanElement );
            }
            if( spanElement ){
                DomUtils.appendChild( spanElement , button );
            }
            ++num ;
        }

        for( let [key , value] of Object.entries(toolTextList) ){
            if(this.elements[key]){
                this.elements[key].title = value ;
            }
        }

        this.render();
    } ;



    /*改变白板配置项*/
     _changeWhiteBoardConfigration(key, value) {
         if( this.whiteBoardManagerInstance ){
             let updateConfigration = {};
             updateConfigration[key] = value;
             this.whiteBoardManagerInstance.changeWhiteBoardConfigration( updateConfigration , this.instanceId );
         }
     }

    /*关闭所有未排除的列表*/
    _closeList( excludeElementKey ){
        if( excludeElementKey !== 'penList' ){
            DomUtils.removeClass( this.elements.penList ,  'open' ) ;
        }
        if( excludeElementKey !== 'shapeList' ){
            DomUtils.removeClass( this.elements.shapeList ,  'open' ) ;
        }
        if( excludeElementKey !== 'settingList' ){
            DomUtils.removeClass( this.elements.settingList ,  'open' ) ;
        }
    }


    /*添加事件*/
    _addEvent(){
        let listElementKeyArray = ['penList' , 'shapeList' , 'settingList'] ;
        let toolKeyArray =   [
            'tool_mouse' , 'tool_laser' , 'tool_text'  , 'tool_eraser' ,
            'tool_pencil' , 'tool_highlighter' , 'tool_line' , 'tool_arrow' ,
            'tool_ellipse' , 'tool_ellipse_empty' , 'tool_rectangle' , 'tool_rectangle_empty'
        ];
        let actionKeyArray = [ 'action_clear' , 'action_redo' ,  'action_undo' ];
        let colorsArray = [
            '#5AC9FA' , '#FFCC00' , '#ED3E3A' , '#4740D2' ,
            '#007BFF' , '#09C62B' , '#000000' , '#EDEDED'
        ];

        DomUtils.removeAllChild( this.elements.colorsContainer );
        for( let colorKey of colorsArray ){
            let button = DomUtils.createElement('button' , undefined , "color-option color-"+( colorKey.replace(/#/g , '') ) , {
                backgroundColor:colorKey
            });
            button.innerHTML = `<span style="border-color: ${colorKey}"></span>` ;
            button.setAttribute('data-color' , colorKey );
            button.onclick = this.changeColorOnClick.bind(this , colorKey);
            DomUtils.appendChild( this.elements.colorsContainer , button );
        }
        this.elements.whiteboardToolbarViewRootElement.onmouseleave = this.whiteboardToolbarViewRootMouseLeave.bind(this);
        this.elements.settingListExtend.onclick = (event) => {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            return false ;
        };
        for( let elementKey of listElementKeyArray ){
            if( this.elements[elementKey] ){
                this.elements[elementKey].onclick = this.listOpenOrCloseOnClick.bind(this ,elementKey ) ;
                this.elements[elementKey].onmouseleave = this.listOpenOrCloseOnMouseLeave.bind(this , elementKey ) ;
            }
        }
        for( let toolKey of toolKeyArray ){
            if( this.elements[toolKey] ){
                this.elements[toolKey].onclick = this.useWhiteboardToolOnClick.bind(this ,toolKey ) ;
            }
        }
        for( let actionKey of actionKeyArray ){
            if( this.elements[actionKey] ){
                this.elements[actionKey].onclick = this.executeWhiteboardAction.bind(this ,actionKey ) ;
            }
        }
    }

    /*设置画笔宽度给slider*/
    _setPencilWidthToSlider(){
        if( this.pencilWidthSlider &&  this.pencilWidthSlider.setProgress ){
            let { pencilWidthScale = 1  } = this.props ;
            this.pencilWidthSlider.setProgress( this.state.viewState.other.pencilWidth / pencilWidthScale );
            if( this.instanceId === 'default' ){
                this.sendActionCommand( 'pencilWidthChange'  , {
                    pencilWidth:this.state.viewState.other.pencilWidth  ,
                    pencilWidthPercentage:this.state.viewState.other.pencilWidth / pencilWidthScale / 100
                });
            }
        }
    }

    /*设置橡皮宽度给slider*/
    _setEraserWidthToSlider(){
        if( this.eraserWidthSlider &&  this.eraserWidthSlider.setProgress ){
            let { eraserWidthScale = 1  } = this.props ;
            this.eraserWidthSlider.setProgress( this.state.viewState.other.eraserWidth / eraserWidthScale );
            if( this.instanceId === 'default' ){
                this.sendActionCommand( 'eraserWidthChange'  , {
                    eraserWidth:this.state.viewState.other.eraserWidth ,
                    eraserWidthPercentage:this.state.viewState.other.eraserWidth / eraserWidthScale / 100 ,
                });
            }
        }
    }

    render(){
        let {  tool = {} , action = {} , other ={} } = this.state.viewState ;
        let { primaryColor, fontFamily , fontSize } = other ;
        let penList = {} ;
        let shapeList = {} ;
        for(let [key , value] of Object.entries( tool ) ){
            if( this.elements[key] ){
                switch ( key ){
                    case 'tool_pencil':
                    case 'tool_highlighter':
                    case 'tool_line':
                    case 'tool_arrow':
                        if( value.isUse  ){
                            penList[key] = value ;
                        }
                        break;
                    case 'tool_rectangle':
                    case 'tool_rectangle_empty':
                    case 'tool_ellipse_empty':
                    case 'tool_ellipse':
                        if( value.isUse  ){
                            shapeList[key] = value ;
                        }
                        break;
                }
                if( value.isUse ){
                    DomUtils.addClass( this.elements[key] , 'active' );
                }else{
                    DomUtils.removeClass( this.elements[key] , 'active' );
                }
                if( value.disabled ){
                    DomUtils.addClass( this.elements[key] , 'disabled' );
                }else{
                    DomUtils.removeClass( this.elements[key] , 'disabled' );
                }
                this.elements[key].disabled = value.disabled ;
            }
        }

        if( Object.keys(penList).length ){
            for( let key of Object.keys(penList) ){
                this.elements.penList.setAttribute('data-current-pen' , key);
                DomUtils.addClass( this.elements.penList , 'active' );
            }
        }else{
            DomUtils.removeClass( this.elements.penList , 'active' );
        }
        if( Object.keys(shapeList).length ){
            for( let key of Object.keys(shapeList) ){
                this.elements.shapeList.setAttribute('data-current-shape' , key);
                DomUtils.addClass( this.elements.shapeList , 'active' );
            }
        }else{
            DomUtils.removeClass( this.elements.shapeList , 'active' );
        }

        for(let [key , value] of Object.entries( action ) ){
            if( this.elements[key] ){
                if( value.disabled ){
                    DomUtils.addClass( this.elements[key] , 'disabled' );
                }else{
                    DomUtils.removeClass( this.elements[key] , 'disabled' );
                }
                this.elements[key].disabled = value.disabled ;
            }
        }
        let colorOptions = this.elements.colorsContainer.getElementsByClassName('color-option');
        for(let colorOption of colorOptions){
            if( colorOption.getAttribute('data-color') === primaryColor ){
                DomUtils.addClass( colorOption , 'active' );
            }else{
                DomUtils.removeClass( colorOption , 'active' );
            }
        }
        let fontFamilyOptions = this.elements.fontFamilyContainer.getElementsByClassName('font-family-option');
        for(let fontFamilyOption of fontFamilyOptions){
            let selectFamilyKey = undefined ;
            for(let languageType of ['ch' , 'tw' , 'en'] ){
                let {  options = {} } = TalkLanguage.get( languageType ).whiteboardToolbar.fontFamily ;
                for(let [key , value] of Object.entries(options) ){
                    if( value === fontFamily ){
                        selectFamilyKey = key ;
                        break ;
                    }
                }
                if(selectFamilyKey){
                    break ;
                }
            }
            if( fontFamilyOption.getAttribute('data-font-family-key') === selectFamilyKey ){
                DomUtils.addClass( fontFamilyOption , 'active' );
            }else{
                DomUtils.removeClass( fontFamilyOption , 'active' );
            }
        }

        let fontSizeOptions = this.elements.fontSizeContainer.getElementsByClassName('font-size-option');
        for(let fontSizeOption of fontSizeOptions){
            if( fontSizeOption.getAttribute('data-font-size') === (''+fontSize) ){
                DomUtils.addClass( fontSizeOption , 'active' );
            }else{
                DomUtils.removeClass( fontSizeOption , 'active' );
            }
        }

    };

}

window.TalkWhiteboardToolbar = TalkWhiteboardToolbar ;
export {TalkWhiteboardToolbar} ;
export default TalkWhiteboardToolbar ;