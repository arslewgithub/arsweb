(async (win) => {
    const style = `
      <style>
          .detail_book_desc span a.addFavBook em {
              background: url(../../../images/icon_nav_03.svg) left center / 19% no-repeat  !important;
              color: #2F2A67; !important;
          }
          .detail_book_desc span a.addFavBook em::after {
              color: #2F2A67; !important;
              content: "加入最愛"; !important;
          }
  
          .detail_book_desc span a.addFavBook em:hover {
              background: url(../../../images/icon_favorite.svg) left center / 20% no-repeat !important;
              color: #FF5653; !important;
          }
  
          .detail_book_desc span a.addFavBook em:hover::after {
              color: #FF5653; !important;
              content: "加入最愛"; !important;
          }
  
  
          .detail_book_desc span a.removeFavBook em {
              background: url(../../../images/icon_favorite.svg) left center / 20% no-repeat !important;
              color: #FF5653; !important;
          }
  
          .detail_book_desc span a.removeFavBook em::after {
              color: #FF5653; !important;
              content: "移除最愛"; !important;
          }
  
          .detail_book_desc span a.removeFavBook em:hover {
              background: url(../../../images/icon_nav_03.svg) left center / 19% no-repeat  !important;
              color: #2F2A67; !important;
          }
  
          .detail_book_desc span a.removeFavBook em:hover::after {
              color: #2F2A67; !important;
              content: "移除最愛"; !important;
          }
      </style>
    `;
    
    const createTemplate = () => {
      return `
        <link rel="stylesheet" href="../../../css/reset.css">
        <link rel="stylesheet" href="../../../css/header.css">
        <link rel="stylesheet" href="../../../css/all.css">
        ${style}
        <div class="detaildesc_content">
            <div class="detail_content">
              <div class="detail_book_img">
                <img src="" alt="" width="100%">
              </div>
              <div class="detail_book_desc">
                  <h3 id="book-name"></h3>
                  <span id="suit-grade"></span>
                  <hr>
                  <aside></aside>
                  <div id="ebook-btn-container"></div>
              </div>
            </div>
            <div class="button_tag"></div>
            <div class="detail_book_desc_pic"></div>
        </div>
      `;
    };
  
    customElements.define('book-detail-display', class extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = createTemplate();
      }
  
      connectedCallback() {
        const url = new URL(window.location.href);
        this.edu = url.searchParams.get("edu");
        this.subject = url.searchParams.get("subject");
        this.year = parseInt(url.searchParams.get("year"));
        this.main = url.searchParams.get("main");
        this.sub = url.searchParams.get("sub");
        this.bookId = url.searchParams.get("bookId");
        this.materialInfo = null;
        this.userFavBook = JSON.parse(sessionStorage.getItem("userFav")) || [];
        this.accessToken = sessionStorage.getItem("accessToken");
        this.userRole = sessionStorage.getItem("userRole");
        this.email = sessionStorage.getItem("userEmail");
        this.isLogin = sessionStorage.getItem("userToken") !== null || sessionStorage.getItem("useAccessToken") === "true";
        this.lock = sessionStorage.getItem("lock") === "true";
        this.isRoleAvaliable = this.isLogin && (this.userRole.includes("教師") || this.userRole.includes("補教") || this.userRole.includes("老師"));
        
        this.init().then();
      }
  
      async init() {
        await this.updateUserInfo();
        const materialResp = await materialSvc.retrieveMaterial(this.bookId);
        this.materialInfo = materialResp.data;
        if (this.isLogin) {
          let userFavResp = await favSvc.retrieveFavoriteBookByEmailEdu({
            email: this.email,
            edu: this.edu
          });
          this.userFavBook = userFavResp.data;
        }
  
        this.initBtnTag();
        this.initBookDescPic();
        this.initBookContent();
  
        this.addEventListeners();
      }
  
      updateUserInfoInSessionStorage() {
        this.userRole = sessionStorage.getItem("userRole");
        this.email = sessionStorage.getItem("userEmail");
        this.isLogin = sessionStorage.getItem("userToken") !== null || sessionStorage.getItem("useAccessToken") === "true";
        this.isRoleAvaliable = this.isLogin && (this.userRole.includes("教師") || this.userRole.includes("補教") || this.userRole.includes("老師"));
        this.lock = sessionStorage.getItem("lock") === "true";
      }
  
      async updateUserInfo() {
        await getUserInfo();
        this.updateUserInfoInSessionStorage();
      }
  
      initBookContent() {
        const bookName = this.shadowRoot.getElementById("book-name");
        bookName.innerText = this.materialInfo.name;
  
        const bookImg = this.shadowRoot.querySelector(".detail_book_img img");
        bookImg.src = this.materialInfo.coverImgUrl;
        bookImg.alt = this.materialInfo.name;
  
        const gradeSpan = this.shadowRoot.getElementById("suit-grade");
        gradeSpan.innerHTML = ``;
        let gradeSpanHtml = ``;
        this.materialInfo.suitableEdu.forEach((edu, index) => {
          if (index === this.materialInfo.suitableEdu.length - 1) {
            gradeSpanHtml = gradeSpanHtml + `
              <strong>${edu}</strong>
            `;
          } else {
            gradeSpanHtml = gradeSpanHtml + `
            <strong>${edu}</strong>、
          `;
          }
        });
        const isInFav = this.userFavBook.filter((e) => e.materialId === this.bookId).length > 0;
        gradeSpan.innerHTML = `適用: ${gradeSpanHtml}
          <a class="favStatus ${isInFav ? 'removeFavBook' : 'addFavBook'}" href="#" data-ga4-value="${this.edu}_${this.subject}_${this.year}_${this.materialInfo.name}">
              <em></em>
          </a>
        `;
  
        const aside = this.shadowRoot.querySelector("aside");
        this.materialInfo.materialDesc.split(/\r?\n/).forEach((line) => {
          const p = document.createElement("p");
          p.innerText = line;
          aside.appendChild(p);
        });
  
        const ebookBtnContainer = this.shadowRoot.getElementById("ebook-btn-container");
        this.initEBookOpenBtn(ebookBtnContainer);
        this.initEBookDownloadBtn(ebookBtnContainer);
        this.initEBookReadBtn(ebookBtnContainer);
      }
  
      initEBookOpenBtn(containerDom) {
        if (this.materialInfo.ebookOpen !== null && this.materialInfo.ebookOpen.trim() !== "") {
          const ebookPop = document.getElementById("ebook-pop");
          const a = document.createElement("a");
          a.classList.add("ebookOpen");
          a.setAttribute("data-ga4-value", `${this.edu}_${this.subject}_${this.year}_${this.materialInfo.name}`);
  
          a.addEventListener("click", async (e) => {
            e.preventDefault();
            const invalidPopId = await this.getInvalidPopId();
            a.href = "#ebook-pop";
            let idToken = sessionStorage.getItem("accessToken");
            let bookPath = this.materialInfo.ebookOpen;
            let bookId = "";
            if (bookPath !== null && bookPath !== "") {
              const urlArr = bookPath.split("/");
              const bookNoCand = urlArr.filter((e) => e.includes("_"));
              if (bookNoCand.length > 0) {
                const bookNo = bookNoCand[0];
                bookId = bookNo.split("_PC")[0];
              }
              if (ebookPop) ebookPop.updateEBookInfo(bookId, this.materialInfo.ebookOpen, this.email, idToken);
            }
            window.location.href = a.href;
          });
  
          const btn = document.createElement("button");
          btn.classList.add("active");
          btn.innerText = "開啟線上版電子書";
          a.appendChild(btn);
          containerDom.appendChild(a);
        }
      }
  
      initEBookDownloadBtn(containerDom) {
        if (this.materialInfo.ebookDownload !== null && this.materialInfo.ebookDownload.trim() !== "") {
          const a = document.createElement("a");
          a.classList.add("ebookDownload");
          a.setAttribute("data-ga4-value", `${this.edu}_${this.subject}_${this.year}_${this.materialInfo.name}`);
  
          a.addEventListener("click", async (e) => {
            e.preventDefault();
            const invalidPopId = await this.getInvalidPopId();
            if (invalidPopId) {
              a.href = invalidPopId;
              window.location.href = a.href;
            } else {
              a.href = this.materialInfo.ebookDownload;
              window.open(a.href);
            }
          });
  
          const btn = document.createElement("button");
          btn.innerText = "下載電腦版電子書";
          a.appendChild(btn);
          containerDom.appendChild(a);
        }
      }
  
      initEBookReadBtn(containerDom) {
        if (this.materialInfo.ebookRead !== null && this.materialInfo.ebookRead.trim() !== "") {
          const a = document.createElement("a");
          a.classList.add("ebookRead");
          a.target = "_blank";
          a.setAttribute("data-ga4-value", `${this.edu}_${this.subject}_${this.year}_${this.materialInfo.name}`);
  
          a.addEventListener("click", async (e) => {
            a.href = this.materialInfo.ebookRead;
          });
  
          const btn = document.createElement("button");
          btn.innerText = "立即試閱電子書";
          a.appendChild(btn);
          containerDom.appendChild(a);
        }
      }
  
      initBtnTag() {
        const btnTag = this.shadowRoot.querySelector(".button_tag");
        let buttonHTML = ``;
        if (this.materialInfo.bookFunctions === null) this.materialInfo.bookFunctions = [];
        this.materialInfo.bookFunctions = this.materialInfo.bookFunctions.sort((a, b) => a.ordered - b.ordered);
  
        this.materialInfo.bookFunctions.forEach((button) => {
          let btnTmpHtml = "";
          try {
            const url = new URL(button.funUrl);
            if (!this.isDownloadUrl(url.href)) {
              btnTmpHtml = `<a class="buttonFun" href="${button.funUrl}" target="_blank"
                            data-ga4-value="${this.edu}_${this.subject}_${this.year}_${this.materialInfo.name}"
                            data-ga4-event="${button.funName}">
                            <button>${button.funName}</button>
                        </a>`;
            } else {
              const hostname = new URL(button.funUrl).hostname;
              let className = "buttonFun downloadBtn";
              if (hostname === "refbook-res.hle.com.tw") {
                className = "buttonFun changeDownloadFile downloadBtn";
              }
              btnTmpHtml = `<a class="${className}"
                              href="${button.funUrl}"
                              data-name="${button.funName}"
                              data-ga4-value="${this.edu}_${this.subject}_${this.year}_${this.materialInfo.name}"
                              data-ga4-event="${button.funName}">
                              <button>${button.funName}</button>
                            </a>`;
            }
          } catch (error) {
            btnTmpHtml = `<a class="buttonFun" href="#"><button>${button.funName}</button></a>`;
          }
          buttonHTML = buttonHTML + btnTmpHtml;
        });
        btnTag.innerHTML = buttonHTML;
        this.initDownloadTagBtnEvent();
      }
  
      initDownloadTagBtnEvent() {
        const downloadBtn = this.shadowRoot.querySelectorAll(".downloadBtn");
        downloadBtn.forEach((btn) => {
          btn.addEventListener("click", async (e) => {
            e.preventDefault();
            const invalidPopId = await this.getInvalidPopId();
            if (invalidPopId) {
              btn.href = invalidPopId;
              window.location.href = btn.href;
            } else {
              window.open(btn.href);
            }
          });
        });
      }
  
      initBookDescPic() {
        const descPic = this.shadowRoot.querySelector(".detail_book_desc_pic");
        let contentHTML = ``;
        if (this.materialInfo.contentImgInfos === null) this.materialInfo.contentImgInfos = [];
        this.materialInfo.contentImgInfos = this.materialInfo.contentImgInfos.sort((a, b) => a.ordered - b.ordered);
  
        this.materialInfo.contentImgInfos.forEach((content) => {
          contentHTML = contentHTML + `
          <img src="${content.imgUrl}" alt="${this.materialInfo.name}" width="100%">
      `;
        });
        descPic.innerHTML = contentHTML;
      }
  
      addEventListeners() {
        const changeDownloadFileBtns = this.shadowRoot.querySelectorAll(".changeDownloadFile");
        changeDownloadFileBtns.forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.preventDefault();
            const funUrl = btn.getAttribute("data-url");
            const funName = btn.getAttribute("data-name");
            if (funUrl !== null && funName !== null) {
              const btnFileExt = funUrl.split(".").pop();
              const btnFileName = `${this.materialInfo.name}_${funName}.${btnFileExt}`;
              this.downloadWithDesireName(funUrl, btnFileName);
            }
          });
        });
  
        const favStatus = this.shadowRoot.querySelector(".favStatus");
        if (favStatus) {
          favStatus.addEventListener("click", async (e) => {
            const invalidPopId = await this.getInvalidPopId();
            if (invalidPopId) {
              favStatus.href = invalidPopId;
            } else {
              if (favStatus.classList.contains("addFavBook")) {
                await favSvc.addFavoriteBook({
                  email: this.email,
                  edu: this.edu,
                  year: this.year,
                  subject: this.subject,
                  materialId: this.bookId
                });
                favStatus.classList.remove("addFavBook");
                favStatus.classList.add("removeFavBook");
              } else {
                await favSvc.deleteFavoriteBookByMaterialId(this.bookId);
                favStatus.classList.add("addFavBook");
                favStatus.classList.remove("removeFavBook");
              }
              await this.updateUserFav();
            }
          });
        }
      }
  
      async updateUserFav() {
        let userFavResp = await favSvc.retrieveFavoriteBookByEmailEdu({
          email: this.email,
          edu: this.edu
        });
        this.userFavBook = userFavResp.data;
        sessionStorage.setItem("userFav", JSON.stringify(this.userFavBook));
      }
  
      downloadWithDesireName(url, name) {
        let xhr = new XMLHttpRequest();
        let a = document.createElement("a");
        let file;
  
        xhr.open("GET", url, true);
        xhr.responseType = "blob";
  
        xhr.onload = function () {
          file = new Blob([xhr.response], { type: "application/octet-stream" });
          a.href = window.URL.createObjectURL(file);
          a.download = name;
          a.click();
        };
        xhr.send();
      }
  
      isDownloadUrl(url) {
        let fileExtensions = [
          '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
          '.zip', '.rar', '.tar', '.gz', '.7z',
          '.mp3', '.mp4', '.avi', '.mkv', '.mov', '.wav', '.flac',
          '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp',
          '.m4a', '.iso'
        ];
        let urlExtension = url.split('.').pop();
        return fileExtensions.includes('.' + urlExtension.toLowerCase());
      }
  
      async getInvalidPopId() {
        if (!this.isLogin) {
          return "#un-login-pop";
        }
  
        await win.checkLock(this.accessToken);
        this.updateUserInfoInSessionStorage();
  
        return null;
      }
    });
  })(window);
  