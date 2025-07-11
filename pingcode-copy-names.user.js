// ==UserScript==
// @name         PingCode快速复制标题文字
// @namespace    https://raw.githubusrcontent.com/NeyberTech/userscripts
// @version      2.5
// @description  PingCode快速复制标题文字
// @author       Neyber Team
// @match        https://*.pingcode.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=pingcode.com
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/NeyberTech/userscripts/master/pingcode-copy-names.user.js
// @updateURL    https://raw.githubusercontent.com/NeyberTech/userscripts/master/pingcode-copy-names.user.js
// @supportURL   https://github.com/NeyberTech/userscripts/issues
// ==/UserScript==

const handleSerialLinePersonOrder = [
    // // 可在此自定义瓶颈环节按「人」顺序输出
    // '名字1', '名字2'
];


(async function() {
    'use strict';

    // # 数据获取与标准化
    const fieldsGetter = {
        title(trEl){
            return trEl.getElementsByClassName('styx-item-title')[0]?.innerText || '';
        },
        pureTitle(trEl){
            return this.title(trEl).replace(emojiRegExp, '').trim();
        },
        statusText(trEl){
            return trEl.getElementsByClassName('styx-state')[0]?.innerText || '';
        },
        statusIcon(trEl){
            let statusText = this.statusText(trEl);
            emojiRegExp.lastIndex = 0;
            return emojiRegExp.test(statusText) ? RegExp.$1 : '';
        },
        enTitle(trEl){
            return trEl.querySelectorAll('[name="yingwengongnengming"]')[0]?.parentNode.innerText || '';
        },
        launchDateText(trEl){
            return trEl.querySelectorAll('[name="yujishangxianri"]')[0]?.parentNode.innerText || '';
        },
        launchDateEnText(trEl){
            let launchDateTimeStamp = this.launchDateTimeStamp(trEl);
            let launchDate = launchDateTimeStamp ? new Date(launchDateTimeStamp) : null;
            return launchDate ? ((new Date().getFullYear() === launchDate.getFullYear() ? '':(launchDate.getFullYear() + ' '))+ ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][launchDate.getMonth()] +' '+ launchDate.getDate()) : '';
        },
        launchDateTimeStamp(trEl){
            let launchDateText = this.launchDateText(trEl);
            if (launchDateText && launchDateText.indexOf('年') === -1) {
                launchDateText = new Date().getFullYear() + '年' + launchDateText;
            }
            return launchDateText ? (new Date(launchDateText.replace(/(年|月|日)/g, '\/').replace(/日/g, ''))).getTime() : null;
        },
        serialLineMainPersons(trEl){
            return getPersonNames(trEl.querySelectorAll('[name="chuanhangpingjinghuanjie"]')[0]);
        },
        serialLineSupportPersons(trEl){
            return getPersonNames(trEl.querySelectorAll('[name="chuanhangpingjingzhichifang"]')[0]);
        },
        valueLevelIcon(trEl){
            let text = trEl.querySelectorAll('[name="zhuyaojiazhiqianli"]')[0]?.parentNode.innerText || '';
            emojiRegExp.lastIndex = 0;
            return emojiRegExp.test(text) ? RegExp.$1 : '';
        }
    }
    function getPersonNames(parentEl){
        let persons = [];
        if (!parentEl) return [];
        persons = persons.concat([].map.call(parentEl.querySelectorAll('img.avatar-avatar'), _=>_.alt).filter(_=>_));
        persons = persons.concat([].map.call(parentEl.querySelectorAll('span.avatar-default'), _=>_.innerText));
        return persons;
    }
    // / 数据获取与标准化

    // # 业务需求
    // ## 事件函数定义
    function handleTitleCopyBtnClick(e){
        handleAnyCopyBtnClick(e, '标题', getFilteredListData().map(_=>_.title).join('\n'));
    }

    function handleStatusCopyBtnClick(e){
        handleAnyCopyBtnClick(e, '状态+标题', getFilteredListData().map(_=>`${_.statusIcon} ${_.title}`).join('\n'));
    }

    function handleLaunchDateCopyBtnClick(e){
        handleAnyCopyBtnClick(e, '状态+标题+预计发布日期', getFilteredListData().map(_=>{
            let launchDateSuffix = _.launchDateText ? (' - 【' + ((_.statusIcon === '🎉'||_.launchDateTimeStamp<Date.now())?'已于':'预计') + _.launchDateText +'上线】') : undefined;
            return [_.statusIcon, _.pureTitle, launchDateSuffix].join('');
        }).join('\n'));
    }

    function handleEnTitleThCopyBtnClick(e){
        handleAnyCopyBtnClick(e, '状态+英文标题+预计发布日期', getFilteredListData().map(_=>{
            let launchDateSuffix = _.launchDateTimeStamp ? ('\n  [' + (_.statusIcon === '🎉'?'Already available':('Available on '+ _.launchDateEnText)) +']') : undefined;
            return ['* ', _.enTitle || _.pureTitle, launchDateSuffix].join('');
        }).join('\n\n'));
    }
    function handleSerialLinePersonsCopyBtnClick(e){
        let outputText = '';
        let uniquePersons = []
        let itemList = JSON.parse(JSON.stringify(getFilteredListData())).map(_=>{
            let launchDateSuffix = _.launchDateText ? (' - 【' + ((_.statusIcon === '🎉'||_.launchDateTimeStamp<Date.now())?'已于':'预计') + _.launchDateText +'上线】') : undefined;
            _.__outputText = [_.valueLevelIcon, _.statusIcon, _.pureTitle, launchDateSuffix].join('');
            _.serialLineMainPersons.concat(_.serialLineSupportPersons).forEach(p=>{
                if (!uniquePersons.includes(p)) {
                    uniquePersons.push(p)
                }
            });
            return _;
        });
        uniquePersons.sort();
        uniquePersons.sort((a,b)=>handleSerialLinePersonOrder.indexOf(a) < handleSerialLinePersonOrder.indexOf(b) ? -1:1);
        uniquePersons.forEach(p=>{
            const mainTypeItems = itemList.filter(_=>_.serialLineMainPersons.includes(p)).map(_=>_.__outputText);
            const supportTypeItems = itemList.filter(_=>_.serialLineSupportPersons.includes(p)).map(_=>_.__outputText);
            outputText += '1. **'+ p +':**';
            if (supportTypeItems.length) {
                outputText += '\n    0. 支持型事务：';
                outputText += '\n        0. '+ supportTypeItems.join('\n        1. ');
            }
            if (mainTypeItems.length) {
                outputText += '\n    1. '+ itemList.filter(_=>_.serialLineMainPersons.includes(p)).map(_=>_.__outputText).join('\n    1. ');
            }
            if (!supportTypeItems.length && !mainTypeItems.length) {
                outputText += '\n    1. 无';
            }
            outputText += '\n';
        });
        outputText += '1. **未指派:**';
        const unassignedItems =itemList.filter(_=>_.serialLineMainPersons.length===0).map(_=>_.__outputText);
        if (unassignedItems.length) {
            outputText += '\n    1. '+ unassignedItems.join('\n    1. ');
        }
        if (!unassignedItems.length) {
            outputText += '\n    1. 无';
        }
        handleAnyCopyBtnClick(e, '按串行瓶颈环节分组+状态+标题+预计发布日期', outputText);
    }
    // // 事件函数定义

    function handleBizRenderAndRefresh(parentEl, refreshCopyButton){
        // ## 按钮渲染和事件绑定
        const titleTh = getTitleEl('标题', parentEl);
        if (titleTh) {
            refreshCopyButton(titleTh, handleTitleCopyBtnClick);
        }

        const statusTh = getTitleEl('状态', parentEl);
        if (statusTh) {
            refreshCopyButton(statusTh, handleStatusCopyBtnClick);
        }

        const launchDateTh = getTitleEl('预计上线日期', parentEl);
        if (launchDateTh) {
            refreshCopyButton(launchDateTh, handleLaunchDateCopyBtnClick);
        }

        const enTitleTh = getTitleEl('英文功能名', parentEl);
        if (enTitleTh) {
            refreshCopyButton(enTitleTh, handleEnTitleThCopyBtnClick);
        }

        const pipelineTitleTh = getTitleEl('🚦 串行瓶颈-主力开发人员', parentEl);
        const pipelineTitleTh2 = getTitleEl('🚦 串行瓶颈-支持型开发人员', parentEl);
        if (pipelineTitleTh) {
            refreshCopyButton(pipelineTitleTh, handleSerialLinePersonsCopyBtnClick);
        }
        if (pipelineTitleTh2) {
            refreshCopyButton(pipelineTitleTh2, handleSerialLinePersonsCopyBtnClick);
        }

        // / 按钮渲染和事件绑定
    }
    // / 业务需求

    function waitUntil(checkFn, intervalTime = 50){
        return new Promise((resolve)=>{
            const loopCheck = async function(){
                if (await checkFn() === true) {
                    resolve();
                }
                else {
                    setTimeout(loopCheck, intervalTime);
                }
            }
            loopCheck();
        });
    }

    const debounceByKeys = (function(){
        const tmoMap = new Map();
        return function (fn, keyBy = ()=>{}, timeout){
            return function(){
                const args = arguments;
                const tmoKey = keyBy(args);
                clearTimeout(tmoMap.get(tmoKey));
                tmoMap.set(tmoKey, setTimeout(()=>{
                    fn.apply(this, args);
                }, timeout));
            };
        }
    })();

    // REF: https://github.com/mathiasbynens/emoji-regex
    const emojiRegExp = /((?:[#*0-9]\uFE0F?\u20E3|[\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23ED-\u23EF\u23F1\u23F2\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB\u25FC\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692\u2694-\u2697\u2699\u269B\u269C\u26A0\u26A7\u26AA\u26B0\u26B1\u26BD\u26BE\u26C4\u26C8\u26CF\u26D1\u26D3\u26E9\u26F0-\u26F5\u26F7\u26F8\u26FA\u2702\u2708\u2709\u270F\u2712\u2714\u2716\u271D\u2721\u2733\u2734\u2744\u2747\u2757\u2763\u27A1\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B55\u3030\u303D\u3297\u3299]\uFE0F?|[\u261D\u270C\u270D](?:\uFE0F|\uD83C[\uDFFB-\uDFFF])?|[\u270A\u270B](?:\uD83C[\uDFFB-\uDFFF])?|[\u23E9-\u23EC\u23F0\u23F3\u25FD\u2693\u26A1\u26AB\u26C5\u26CE\u26D4\u26EA\u26FD\u2705\u2728\u274C\u274E\u2753-\u2755\u2795-\u2797\u27B0\u27BF\u2B50]|\u26F9(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|\u2764\uFE0F?(?:\u200D(?:\uD83D\uDD25|\uD83E\uDE79))?|\uD83C(?:[\uDC04\uDD70\uDD71\uDD7E\uDD7F\uDE02\uDE37\uDF21\uDF24-\uDF2C\uDF36\uDF7D\uDF96\uDF97\uDF99-\uDF9B\uDF9E\uDF9F\uDFCD\uDFCE\uDFD4-\uDFDF\uDFF5\uDFF7]\uFE0F?|[\uDF85\uDFC2\uDFC7](?:\uD83C[\uDFFB-\uDFFF])?|[\uDFC3\uDFC4\uDFCA](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDFCB\uDFCC](?:\uFE0F|\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDCCF\uDD8E\uDD91-\uDD9A\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF84\uDF86-\uDF93\uDFA0-\uDFC1\uDFC5\uDFC6\uDFC8\uDFC9\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF8-\uDFFF]|\uDDE6\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF]|\uDDE7\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF]|\uDDE8\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF5\uDDF7\uDDFA-\uDDFF]|\uDDE9\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF]|\uDDEA\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA]|\uDDEB\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7]|\uDDEC\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE]|\uDDED\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA]|\uDDEE\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9]|\uDDEF\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5]|\uDDF0\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF]|\uDDF1\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE]|\uDDF2\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF]|\uDDF3\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF]|\uDDF4\uD83C\uDDF2|\uDDF5\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE]|\uDDF6\uD83C\uDDE6|\uDDF7\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC]|\uDDF8\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF]|\uDDF9\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF]|\uDDFA\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF]|\uDDFB\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA]|\uDDFC\uD83C[\uDDEB\uDDF8]|\uDDFD\uD83C\uDDF0|\uDDFE\uD83C[\uDDEA\uDDF9]|\uDDFF\uD83C[\uDDE6\uDDF2\uDDFC]|\uDFF3\uFE0F?(?:\u200D(?:\u26A7\uFE0F?|\uD83C\uDF08))?|\uDFF4(?:\u200D\u2620\uFE0F?|\uDB40\uDC67\uDB40\uDC62\uDB40(?:\uDC65\uDB40\uDC6E\uDB40\uDC67|\uDC73\uDB40\uDC63\uDB40\uDC74|\uDC77\uDB40\uDC6C\uDB40\uDC73)\uDB40\uDC7F)?)|\uD83D(?:[\uDC3F\uDCFD\uDD49\uDD4A\uDD6F\uDD70\uDD73\uDD76-\uDD79\uDD87\uDD8A-\uDD8D\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA\uDECB\uDECD-\uDECF\uDEE0-\uDEE5\uDEE9\uDEF0\uDEF3]\uFE0F?|[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC](?:\uD83C[\uDFFB-\uDFFF])?|[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDD74\uDD90](?:\uFE0F|\uD83C[\uDFFB-\uDFFF])?|[\uDC00-\uDC07\uDC09-\uDC14\uDC16-\uDC3A\uDC3C-\uDC3E\uDC40\uDC44\uDC45\uDC51-\uDC65\uDC6A\uDC79-\uDC7B\uDC7D-\uDC80\uDC84\uDC88-\uDC8E\uDC90\uDC92-\uDCA9\uDCAB-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDDA4\uDDFB-\uDE2D\uDE2F-\uDE34\uDE37-\uDE44\uDE48-\uDE4A\uDE80-\uDEA2\uDEA4-\uDEB3\uDEB7-\uDEBF\uDEC1-\uDEC5\uDED0-\uDED2\uDED5-\uDED7\uDEDD-\uDEDF\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB\uDFF0]|\uDC08(?:\u200D\u2B1B)?|\uDC15(?:\u200D\uD83E\uDDBA)?|\uDC3B(?:\u200D\u2744\uFE0F?)?|\uDC41\uFE0F?(?:\u200D\uD83D\uDDE8\uFE0F?)?|\uDC68(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDC68\uDC69]\u200D\uD83D(?:\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?)|[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?)|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF-\uDDB3\uDDBC\uDDBD]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFC-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF-\uDDB3\uDDBC\uDDBD]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFD-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF-\uDDB3\uDDBC\uDDBD]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF-\uDDB3\uDDBC\uDDBD]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFD\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF-\uDDB3\uDDBC\uDDBD]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFE])))?))?|\uDC69(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?[\uDC68\uDC69]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?|\uDC69\u200D\uD83D(?:\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?))|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF-\uDDB3\uDDBC\uDDBD]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFC-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF-\uDDB3\uDDBC\uDDBD]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB\uDFFD-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF-\uDDB3\uDDBC\uDDBD]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF-\uDDB3\uDDBC\uDDBD]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB-\uDFFD\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF-\uDDB3\uDDBC\uDDBD]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB-\uDFFE])))?))?|\uDC6F(?:\u200D[\u2640\u2642]\uFE0F?)?|\uDD75(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|\uDE2E(?:\u200D\uD83D\uDCA8)?|\uDE35(?:\u200D\uD83D\uDCAB)?|\uDE36(?:\u200D\uD83C\uDF2B\uFE0F?)?)|\uD83E(?:[\uDD0C\uDD0F\uDD18-\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5\uDEC3-\uDEC5\uDEF0\uDEF2-\uDEF6](?:\uD83C[\uDFFB-\uDFFF])?|[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDDDE\uDDDF](?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDD0D\uDD0E\uDD10-\uDD17\uDD20-\uDD25\uDD27-\uDD2F\uDD3A\uDD3F-\uDD45\uDD47-\uDD76\uDD78-\uDDB4\uDDB7\uDDBA\uDDBC-\uDDCC\uDDD0\uDDE0-\uDDFF\uDE70-\uDE74\uDE78-\uDE7C\uDE80-\uDE86\uDE90-\uDEAC\uDEB0-\uDEBA\uDEC0-\uDEC2\uDED0-\uDED9\uDEE0-\uDEE7]|\uDD3C(?:\u200D[\u2640\u2642]\uFE0F?|\uD83C[\uDFFB-\uDFFF])?|\uDDD1(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF-\uDDB3\uDDBC\uDDBD]|\uDD1D\u200D\uD83E\uDDD1))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFC-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF-\uDDB3\uDDBC\uDDBD]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB\uDFFD-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF-\uDDB3\uDDBC\uDDBD]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF-\uDDB3\uDDBC\uDDBD]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB-\uDFFD\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF-\uDDB3\uDDBC\uDDBD]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB-\uDFFE]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF-\uDDB3\uDDBC\uDDBD]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?))?|\uDEF1(?:\uD83C(?:\uDFFB(?:\u200D\uD83E\uDEF2\uD83C[\uDFFC-\uDFFF])?|\uDFFC(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB\uDFFD-\uDFFF])?|\uDFFD(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])?|\uDFFE(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB-\uDFFD\uDFFF])?|\uDFFF(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB-\uDFFE])?))?)))/g;

    function getTitleEl(titleText='', parentEl = document){
        return [].find.call(parentEl.getElementsByClassName('styx-table-column-has-action'), (el)=>[titleText, titleText+'\n⭐️', titleText+'\n🔺'].includes(el.innerText));
    }

    const copy = (function (){
        let textArea;
        return function (text) {
            if (!textArea) {
                textArea = document.createElement('textArea');
                textArea.style.height = 0;
                textArea.style.width = 0;
                textArea.style.opacity = 0;
                textArea.style.left = 0;
                textArea.style.top = 0;
                textArea.style.position = 'absolute';
                document.body.appendChild(textArea);
            }
            textArea.value = text;
            textArea.select();
            document.execCommand('copy');
        }
    })();

    let downingKey = {};

    function getListData(){
        let list = [];
        [].forEach.call(document.querySelectorAll('tr.styx-table-quick-editor-row'), (trEl)=>{
            let obj = {};
            for(let key in fieldsGetter) {
                obj[key] = fieldsGetter[key](trEl)
            }
            list.push(obj);
        });
        return list;
    }

    function getFilteredListData(){
        const list = getListData();
        // 按住 Alt、Option 键时，只复制带 ⭐️ 的记录，若再同时按住 Control/Shift 键的话，只复制带 🔺 的记录
        if (downingKey.Alt && downingKey.Shift) {
            return list.filter(_=>_.title.indexOf('🔺') !== -1);
        }
        else if (downingKey.Alt) {
            return list.filter(_=>_.title.indexOf('⭐️') !== -1);
        }
        else {
            return list;
        }
    }

    function handleGlobalKeyDown(e){
        downingKey[e.key] = true;
    }

    function handleGlobalKeyUp(e){
        delete downingKey[e.key];
    }

    // Alert 执行后 JS 会阻塞，导致无法正常捕获和执行 keyup 事件，因此全局在 Alert 后清空 downingKey，当做没有键按下，重新来。
    const _alert = window.alert;
    window.alert = function(){
        _alert.apply(this, arguments);
        downingKey = {};
        debouncedRefresh();
    }


    function handleAnyCopyBtnClick(e, contentDescribeText, textToCopy){
        e.stopPropagation();
        copy(textToCopy);
        alert(`已复制当前页面所有卡片的「${contentDescribeText}」${(downingKey.Alt || (downingKey.Alt && downingKey.Shift)) ? ('（仅包含带'+(downingKey.Shift ? '🔺':'⭐️')+'项目）'):''}`);
    }

    function createElementOfCopyButton(){
        const titleCopyBtn = document.createElement('A');
        titleCopyBtn.style.display = 'block';
        titleCopyBtn.style.boxSizing = 'border-box';
        titleCopyBtn.style.height = titleCopyBtn.style.width = '30px';
        titleCopyBtn.style.position = 'absolute';
        titleCopyBtn.style.right = '25px';
        titleCopyBtn.style.top = '50%';
        titleCopyBtn.style.marginTop = '-15px';
        titleCopyBtn.style.padding = '7px';
        titleCopyBtn._AltDowningStyle = `${downingKey.Alt}-${downingKey.Shift}`;
        titleCopyBtn.innerHTML = `
            ${(downingKey.Alt || (downingKey.Alt && downingKey.Shift)) ? ('<span style="position: absolute; z-index: 1; font-size: 12px; right: 2px; bottom: 2px;">'+(downingKey.Shift ? '🔺':'⭐️')+'</span>'):''}
            <svg style="width: 16px; height: 16px; opacity: 0.5;" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
        `;
        return titleCopyBtn;
    }

    function refresh(parentEl = document){
        if (typeof parentEl.getElementsByTagName !== 'function') {
            return ;
        }
        function refreshCopyButton(parentEl, onClickFn){
            let copyBtn = [].find.call(parentEl.childNodes, (n)=>n._copyBtn);
            if (copyBtn && copyBtn._AltDowningStyle != `${downingKey.Alt}-${downingKey.Shift}`) {
                copyBtn.parentNode.removeChild(copyBtn);
                copyBtn = null;
            }
            if(!copyBtn) {
                copyBtn = createElementOfCopyButton();
                copyBtn._copyBtn = true;
                copyBtn.onclick = onClickFn;
                parentEl.appendChild(copyBtn);
            }
        }

        handleBizRenderAndRefresh(parentEl, refreshCopyButton);
    }

    const debouncedRefresh = debounceByKeys(refresh, (parentEl)=>parentEl, 1);

    function init(){
        refresh();

        new MutationObserver((mutationList, observer) => {
            for (const mutation of mutationList) {
                [mutation.target].concat(mutation.addedNodes||[]).forEach((node)=>{
                    if (node) {
                        debouncedRefresh( node );
                    }
                });
            }
        }).observe(document, { attributes: true, childList: true, subtree: true });

        window.addEventListener( "keydown", function( e ){
            handleGlobalKeyDown(e);
            debouncedRefresh();
        }, true);
        window.addEventListener( "keyup", function( e ){
            handleGlobalKeyUp(e);
            debouncedRefresh();
        }, true);

        console.log('inited');
    }

    // 避免卡住首屏加载
    await waitUntil(()=>{
        return !!getTitleEl('标题');
    });

    init();
})();
