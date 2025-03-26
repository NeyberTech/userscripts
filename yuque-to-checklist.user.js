// ==UserScript==
// @name         语雀文档变任务清单
// @namespace    https://raw.githubusercontent.com/NeyberTech/userscripts
// @version      1.3
// @description  给语雀文档的每一行加一个勾选框，本地浏览器存储
// @author       Neyber Team
// @match        https://*.yuque.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=yuque.com
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
};

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

(async function() {
    'use strict';

    const STORE_KEYS = {
        checkedLiMapById: '_yuqueDocToCheckList__checkedLiMapById',
        summaryMapByDocId: '_yuqueDocToCheckList__summaryMapByDocId'
    };
    const STORE_KEYS_LIST = Object.values(STORE_KEYS);
    let checkedLiMapById;
    let summaryMapByDocId;

    function loadJSONDataFromStorage(key, checkAndInitialFn){
        let value = localStorage.getItem(key);
        if (value) {
            try{
                value = JSON.parse(value)
            } catch(e) {
                console.error(`JSON parse error when load from localStorage with key "${key}", the value is: ${value}`, e)
            }
        }
        return checkAndInitialFn(value);
    }

    function loadStorage(){
        function checkAndInitAsObject(value){
            if (!value || typeof value != 'object') {
                return {};
            }
            return value;
        }
        checkedLiMapById = loadJSONDataFromStorage(STORE_KEYS.checkedLiMapById, checkAndInitAsObject);
        summaryMapByDocId = loadJSONDataFromStorage(STORE_KEYS.summaryMapByDocId, checkAndInitAsObject);
    }

    function saveToStorage(){
        localStorage.setItem(STORE_KEYS.checkedLiMapById, JSON.stringify(checkedLiMapById));
        localStorage.setItem(STORE_KEYS.summaryMapByDocId, JSON.stringify(summaryMapByDocId));
    }

    function handleToggleCheckbox(e){
        checkedLiMapById[e.target.unionId] = e.target.checked;
        refresh();
        saveToStorage();
    }

    function getDocId(pathname = location.pathname){
        return pathname.replace(/(\/)?((\?|#).+)?$/, '').split('/').slice(-1)[0];
    }

    function getUnionId(id){
        return getDocId() + '-' + id;
    }

    function refreshChecklist(parentEl = document){
        if (typeof parentEl.getElementsByTagName !== 'function') {
            return ;
        }
        [].concat(
            [].slice.call(parentEl.getElementsByTagName('ne-oli-c'), 0),
            [].slice.call(parentEl.getElementsByTagName('ne-uli-c'), 0),
            [].slice.call(parentEl.getElementsByTagName('ne-h1'), 0),
            [].slice.call(parentEl.getElementsByTagName('ne-h2'), 0),
            [].slice.call(parentEl.getElementsByTagName('ne-h3'), 0),
            [].slice.call(parentEl.getElementsByTagName('ne-h4'), 0),
            [].slice.call(parentEl.getElementsByTagName('ne-h5'), 0),
            [].slice.call(parentEl.getElementsByTagName('ne-h6'), 0)
        ).forEach((node)=>{
            if(!!node.id) {
                const unionId = getUnionId(node.id)
                const expectedChecked = checkedLiMapById[unionId];

                let insertTarget, insertTargetContainer;
                if (/ne-h\d/i.test(node.tagName)) {
                    insertTarget = node.querySelectorAll('ne-heading-content ne-text')[0];
                    insertTargetContainer = insertTarget?.parentNode;
                }
                else {
                    insertTarget = node.childNodes[0];
                    insertTargetContainer = node;
                }

                if (insertTarget) {
                    let checkbox = [].find.call(insertTargetContainer.childNodes, (n)=>n.__checklist__listItemCheckbox);
                    if(!checkbox) {
                        checkbox = document.createElement('Input');
                        checkbox.type = 'checkbox';
                        checkbox.unionId = unionId;
                        checkbox.__checklist__listItemCheckbox = true;
                        checkbox.style.marginRight = '5px'
                        checkbox.onchange = handleToggleCheckbox;
                        checkbox.checked = expectedChecked;
                        insertTargetContainer.insertBefore(checkbox, insertTarget);
                    }
                    else if (expectedChecked !== checkbox.checked) {
                        checkbox.checked = expectedChecked;
                    }
                }
            }
        });
    }

    function refreshSummary(parentEl = document){
        if (!parentEl || typeof parentEl.getElementsByTagName !== 'function') {
            return ;
        }
        [].slice.call(parentEl.getElementsByClassName('doc-title'), 0, 1).filter(_=>_).forEach((node)=>{
            const checkboxList = [].slice.call(document.querySelectorAll('input[type="checkbox"]'), 0).filter(_=>!!_.__checklist__listItemCheckbox);
            const checkedCheckboxList = checkboxList.filter(_=>_.checked);
            const summary = {
                checkedNum: checkedCheckboxList.length,
                totalNum: checkboxList.length,
                percentText: checkboxList.length === 0 ? '-%' : Math.floor(checkedCheckboxList.length/checkboxList.length*100) +'%'
            };
            const expectedInnerHTML = `[<strong>${summary.percentText} Checked</strong> - ${summary.checkedNum || 0}/${summary.totalNum || 0}]`;

            const docId = getDocId();
            if (JSON.stringify(summaryMapByDocId[docId]) !== JSON.stringify(summary)) {
                summaryMapByDocId[docId] = summary;
            }

            let summaryEl = [].find.call(node.childNodes, (n)=>n.__checklist__docTitleSummary);
            if(!summaryEl) {
                summaryEl = document.createElement('span');
                summaryEl.__checklist__docTitleSummary = true;
                summaryEl.style.marginLeft = '10px'
                summaryEl.style.color = '#333'

                summaryEl.innerHTML = expectedInnerHTML;
                node.appendChild(summaryEl);
            }

            if (expectedInnerHTML !== summaryEl.innerHTML) {
                summaryEl.innerHTML = expectedInnerHTML;
            }
        });
    }

    function refreshSummaryOnSideNavigator(parentEl = document){
        if (!parentEl || typeof parentEl.getElementsByTagName !== 'function') {
            return ;
        }
        const sideNavEl = document.getElementById('navBox');
        if (!sideNavEl) return ;
        [].slice.call(sideNavEl.querySelectorAll('a'), 0).filter(n=>n.className.indexOf('catalogTreeItem-module_content_') === 0).forEach((aEl)=>{
            const docId = getDocId(aEl.href);
            const summary = summaryMapByDocId[docId];
            if (!summary || !summary.checkedNum) return ;

            const expectedInnerHTML = `[${summary.percentText}]`;

            const appenderEl = [].find.call(aEl.childNodes, (n)=>n.className.indexOf('catalogTreeItem-module_titleWrapper_') === 0);
            if (!appenderEl) return ;

            let summaryEl = [].find.call(appenderEl.childNodes, (n)=>n.__checklist__sideNaviDocSummary);
            if(!summaryEl) {
                summaryEl = document.createElement('span');
                summaryEl.__checklist__sideNaviDocSummary = true;
                summaryEl.style.marginLeft = '3px'

                summaryEl.innerHTML = expectedInnerHTML;
                appenderEl.appendChild(summaryEl);
            }

            if (expectedInnerHTML !== summaryEl.innerHTML) {
                summaryEl.innerHTML = expectedInnerHTML;
            }
        });
    }

    function refresh(parentEl = document){
        if (!parentEl || typeof parentEl.getElementsByTagName !== 'function') {
            return ;
        }
        refreshChecklist(parentEl);
        refreshSummary(parentEl);
        refreshSummaryOnSideNavigator(parentEl);
    }

    function handleStorageChange(e){
        if (STORE_KEYS_LIST.includes(e.key)) {
            console.log('Checklist: Changed by another page.')
            loadStorage();
            refresh();
        }
    }

    const debouncedRefresh = debounceByKeys(refresh, (parentEl)=>parentEl, 1);
    const debouncedHandleStorageChange = debounceByKeys(handleStorageChange, () => 'localStorage', 10);

    function init(){
        loadStorage();
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

        window.addEventListener('storage', debouncedHandleStorageChange);

        console.log('inited');
    }

    await waitUntil(()=>{
        return document.getElementsByClassName('ne-viewer-body')[0]?.childNodes.length > 0
    });

    init();
})();
