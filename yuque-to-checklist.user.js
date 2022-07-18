// ==UserScript==
// @name         语雀文档变任务清单
// @namespace    https://raw.githubusercontent.com/NeyberTech/userscripts
// @version      0.1
// @description  给语雀文档的每一行加一个勾选框，本地浏览器存储
// @author       AlexLee
// @match        https://*.yuque.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/NeyberTech/userscripts/master/yuque-to-checklist.user.js
// @updateURL    https://raw.githubusercontent.com/NeyberTech/userscripts/master/yuque-to-checklist.user.js
// @supportURL   https://github.com/NeyberTech/userscripts/issues
// ==/UserScript==

function delay(time){
    return new Promise(resolve => setTimeout(resolve, time))
}

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

(async function() {
    'use strict';

    const STORE_KEY_checkedLiMapById = '_yuqueDocToCheckList__checkedLiMapById'
    let checkedLiMapById;

    function loadStorage(){
        checkedLiMapById = localStorage.getItem(STORE_KEY_checkedLiMapById);
        if (checkedLiMapById) {
            try{
                checkedLiMapById = JSON.parse(checkedLiMapById)
            } catch(e) {
                console.error('JSON parse error')
            }
        }
        if (!checkedLiMapById || typeof checkedLiMapById != 'object') {
            checkedLiMapById = {}
        }
    }

    function saveToStorage(){
        localStorage.setItem(STORE_KEY_checkedLiMapById, JSON.stringify(checkedLiMapById));
    }

    function handleToggleCheckbox(e){
        checkedLiMapById[e.target.unionId] = e.target.checked;
        saveToStorage();
    }

    function getUnionId(id){
        return location.pathname.split('/').slice(-1)[0] + '-' + id;
    }

    function refresh(parentEl = document){
        if (typeof parentEl.getElementsByTagName !== 'function') {
            return ;
        }
        [].forEach.call(
            [].slice.call(parentEl.getElementsByTagName('ne-oli-c'), 0).concat(
                [].slice.call(parentEl.getElementsByTagName('ne-uli-c'), 0)
            )
        , (node)=>{
//            [].find.call(node.childNodes || [], (n)=>n.nodeName=='#text') &&
          if(!!node.id) {
            let checkbox = [].find.call(node.childNodes, (n)=>n._checkListItemBox);
            if(!checkbox) {
                const checkbox = document.createElement('Input');
                checkbox.type = 'checkbox';
                checkbox.unionId = getUnionId(node.id);
                checkbox.checked = checkedLiMapById[checkbox.unionId];
                checkbox._checkListItemBox = true;
                checkbox.style.marginRight = '5px'
                checkbox.onchange = handleToggleCheckbox;
                node.insertBefore(checkbox, node.childNodes[0]);
            }
            else {
            }
          }
        });
    }

    function init(){
        loadStorage();
        refresh();
		document.body.addEventListener( "DOMSubtreeModified", function( e ){
			refresh( e.target );
		}, true);
        console.log('inited');
    }

    await waitUntil(()=>{
        return document.getElementsByClassName('ne-viewer-body')[0]?.childNodes.length > 0
    });

    init();
})();