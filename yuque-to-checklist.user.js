// ==UserScript==
// @name         语雀文档变任务清单
// @namespace    https://raw.githubusercontent.com/NeyberTech/userscripts
// @version      1.7
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

function showToast(message = '操作成功', duration = 2000) {
  // 创建样式
  const style = document.createElement('style');
  style.textContent = `
    ._custom_toast_ {
      visibility: hidden;
      min-width: 120px;
      background-color: rgba(0,0,0,0.7);
      color: #fff;
      text-align: center;
      border-radius: 8px;
      padding: 10px 16px;
      position: fixed;
      left: 50%;
      top: 60px;
      transform: translateX(-50%);
      z-index: 9999;
      font-size: 14px;
      opacity: 0;
      transition: opacity 0.5s ease, visibility 0s linear 0.5s;
    }
    ._custom_toast_.show {
      visibility: visible;
      opacity: 1;
      transition: opacity 0.5s ease;
    }
  `;
  document.head.appendChild(style);

  // 创建 toast 元素
  const toast = document.createElement('div');
  toast.className = '_custom_toast_';
  toast.textContent = message;
  document.body.appendChild(toast);

  // 强制触发 reflow 再添加类名
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // 移除 toast 和样式
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
      style.remove();
    }, 500); // 动画结束后清理 DOM
  }, duration);
}

;(async function() {
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
            [].slice.call(parentEl.getElementsByTagName('ne-h6'), 0),
            [].slice.call(parentEl.getElementsByTagName('ne-h6'), 0),
            [].slice.call([].map.call(parentEl.querySelectorAll('tr.ne-tr'), tr=>tr.querySelector('ne-p')).filter(_=>_), 0)
        ).forEach((node)=>{
            if(!!node.id && !node.closest('.ne-engine[contenteditable="true"]')) {
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
                    let checkboxContainer = [].find.call(insertTargetContainer.childNodes, (n)=>n.__checklist__listItemCheckboxContainer);
                    let checkbox;
                    if(checkboxContainer) {
                        checkbox = [].find.call(checkboxContainer.childNodes, (n)=>n.__checklist__listItemCheckbox);
                    }
                    if(!checkbox) {
                        checkboxContainer = document.createElement('Span');
                        checkboxContainer.__checklist__listItemCheckboxContainer = true;
                        checkbox = document.createElement('Input');
                        checkbox.type = 'checkbox';
                        checkbox.unionId = checkbox.id = unionId;
                        checkbox.__checklist__listItemCheckbox = true;
                        checkbox.style.marginRight = '3px'
                        checkbox.style.display = 'inline-block';
                        checkbox.style.verticalAlign = 'middle';
                        checkbox.onchange = handleToggleCheckbox;
                        checkbox.checked = expectedChecked;
                        checkboxContainer.appendChild(checkbox);

                        let linkCopyBtn = document.createElement('span');
                        linkCopyBtn.__checklist__listItemLinkCopyBtn = true;
                        linkCopyBtn.unionId = unionId;
                        linkCopyBtn.nodeId = node.id;
                        linkCopyBtn.style.cursor = 'pointer';
                        linkCopyBtn.style.marginRight = '5px';
                        linkCopyBtn.style.lineHeight = '7px';
                        linkCopyBtn.style.display = 'inline-block';
                        linkCopyBtn.style.verticalAlign = 'middle';
                        let linkCopyBtnIcon = document.createElement('img');
                        linkCopyBtnIcon.src = 'data:image/svg+xml;utf8,<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.88 122.88" fill="rgb(170, 170, 170)"><title>hyperlink</title><path d="M60.54,34.07A7.65,7.65,0,0,1,49.72,23.25l13-12.95a35.38,35.38,0,0,1,49.91,0l.07.08a35.37,35.37,0,0,1-.07,49.83l-13,12.95A7.65,7.65,0,0,1,88.81,62.34l13-13a20.08,20.08,0,0,0,0-28.23l-.11-.11a20.08,20.08,0,0,0-28.2.07l-12.95,13Zm14,3.16A7.65,7.65,0,0,1,85.31,48.05L48.05,85.31A7.65,7.65,0,0,1,37.23,74.5L74.5,37.23ZM62.1,89.05A7.65,7.65,0,0,1,72.91,99.87l-12.7,12.71a35.37,35.37,0,0,1-49.76.14l-.28-.27a35.38,35.38,0,0,1,.13-49.78L23,50A7.65,7.65,0,1,1,33.83,60.78L21.12,73.49a20.09,20.09,0,0,0,0,28.25l0,0a20.07,20.07,0,0,0,28.27,0L62.1,89.05Z"/></svg>';
                        linkCopyBtnIcon.height = 10;
                        linkCopyBtnIcon.width = 10;
                        linkCopyBtn.appendChild(linkCopyBtnIcon);
                        checkboxContainer.appendChild(linkCopyBtn);

                        insertTargetContainer.insertBefore(checkboxContainer, insertTarget);
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
        [].slice.call(parentEl.getElementsByClassName('header-crumb'), 0, 1).filter(_=>_).forEach((node)=>{
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

    function handleLinkCopyBtnClick(e){
        let aEl = e.target.parentNode;
        if (aEl && aEl.__checklist__listItemLinkCopyBtn) {
            copy(window.location.href.replace(/\#.*/gi, '') + '#' + aEl.nodeId);
            showToast('Link copied.');
        }
    }

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

        window.addEventListener('click', handleLinkCopyBtnClick);

        console.log('inited');
    }

    await waitUntil(()=>{
        return document.getElementsByClassName('ne-viewer-body')[0]?.childNodes.length > 0
    });

    init();
})();
