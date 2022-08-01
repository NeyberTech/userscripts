// ==UserScript==
// @name         PingCode快速复制标题文字
// @namespace    https://raw.githubusercontent.com/NeyberTech/userscripts
// @version      0.1
// @description  PingCode快速复制标题文字
// @author       Neyber Team
// @match        https://*.pingcode.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=pingcode.com
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/NeyberTech/userscripts/master/pingcode-copy-names.user.js
// @updateURL    https://raw.githubusercontent.com/NeyberTech/userscripts/master/pingcode-copy-names.user.js
// @supportURL   https://github.com/NeyberTech/userscripts/issues
// ==/UserScript==

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

function getTitleThEl(parentEl = document){
    return [].find.call(parentEl.getElementsByClassName('styx-table-column-has-action'), (el)=>el.innerText=='标题');
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

(async function() {
    'use strict';

    function getItemNameListText(){
        let names = [];
        [].forEach.call(document.getElementsByClassName('agile-table-quick-editor'), (trEl)=>{
            [].forEach.call(trEl.getElementsByClassName('table-column-work-item-name'), (nameEl)=>{
                names.push(nameEl.innerText);
            });
        });
        return names.join('\n');
    }

    function handleTitleCopyBtnClick(e){
        e.stopPropagation();
        copy(getItemNameListText());
        alert("已复制当前页面所有卡片的标题");
    }

    function refresh(parentEl = document){
        if (typeof parentEl.getElementsByTagName !== 'function') {
            return ;
        }
        const titleTh = getTitleThEl(parentEl);
        if (titleTh) {
            let titleCopyBtn = [].find.call(titleTh.childNodes, (n)=>n._titleCopyBtn);
            if(!titleCopyBtn) {
                titleCopyBtn = document.createElement('A');
                titleCopyBtn._titleCopyBtn = true;
                titleCopyBtn.style.display = 'block';
                titleCopyBtn.style.boxSizing = 'border-box';
                titleCopyBtn.style.height = titleCopyBtn.style.width = '30px';
                titleCopyBtn.style.position = 'absolute';
                titleCopyBtn.style.right = '20px';
                titleCopyBtn.style.top = '50%';
                titleCopyBtn.style.marginTop = '-15px';
                titleCopyBtn.style.padding = '7px';
                titleCopyBtn.innerHTML = '<svg style="width: 16px; height: 16px; opacity: 0.5;" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';
                titleCopyBtn.onclick = handleTitleCopyBtnClick;
                titleTh.appendChild(titleCopyBtn);
            }
            else {
            }
        }
//        const fastMenu = parentEl.getElementsByClassName('quick-operation-pop action-menu')[0];
//        if (fastMenu) {
//            const memuId = document.getElementsByTagName('thy-popover-container')[0]?.id || 'x';
//            const targetItemIndex = Number(memuId.split('-').slice(-1)[0]);
//            if (!isNaN(targetItemIndex)) {
//                console.log(targetItemIndex)
//            }
//        }
    }

    const debouncedRefresh = debounceByKeys(refresh, (parentEl)=>parentEl, 1);

    function init(){
        refresh();
		document.body.addEventListener( "DOMSubtreeModified", function( e ){
			debouncedRefresh( e.target );
		}, true);
        console.log('inited');
    }

    // 避免卡住首屏加载
    await waitUntil(()=>{
        return !!getTitleThEl();
    });

    init();
})();
