((win) => {
  const createTemplate = () => {
    return `
    <link rel="stylesheet" href="../../../css/reset.css">
    <link rel="stylesheet" href="../../../css/header.css">
    <link rel="stylesheet" href="../../../css/all.css">
    <link rel="stylesheet" href="../../../css/table.css">
    <div class="popup">
      <a class="close" href="#">&times;</a>
      <div class="content">
        <table class="tb_popup">
          <h2 id="ebookTitle"></h2>
          <thead>
          <tr>
            <th>名稱</th>
            <th>時間</th>
            <th>功能</th>
          </tr>
          </thead>
          <tbody id="ebookSelect"></tbody>
        </table>
        <div class="btn">
            <a id="refreshRecord"><span>同步紀錄</span></a>
            <a id="openNewEBook" target="_blank"><span>開啟電子書</span></a>
        </div>
      </div>
    </div>
    `
  }

  customElements.define('ebook-pop', class extends HTMLElement {
    constructor() {
      super()
      this.userEmail = sessionStorage.getItem("userEmail")
      this.bookId = null
      this.bookPath = null
      this.idToken = null

      this.userRole = sessionStorage.getItem("userRole")
      this.isLogin = sessionStorage.getItem("userToken") !== null || sessionStorage.getItem("useAccessToken") === "true"
      this.lock = sessionStorage.getItem("lock") === "true"
      this.isRoleAvaliable = this.isLogin && (this.userRole.includes("教師") || this.userRole.includes("補教") || this.userRole.includes("老師"))
      this.accessToken = sessionStorage.getItem("accessToken")

      this.attachShadow({ mode: 'open' })
      this.shadowRoot.innerHTML = createTemplate()
      this.addEventListeners().then()
    }

    updateUserInfoInSessionStorage(){
      this.userRole = sessionStorage.getItem("userRole")
      this.userEmail = sessionStorage.getItem("userEmail")
      this.isLogin = sessionStorage.getItem("userToken") !== null || sessionStorage.getItem("useAccessToken") === "true"
      this.isRoleAvaliable = this.isLogin && (this.userRole.includes("教師") || this.userRole.includes("補教") || this.userRole.includes("老師"))
      this.lock = sessionStorage.getItem("lock") === "true"
    }


    async updateEBookInfo(bookId, bookPath, userEmail, idToken) {
      this.bookId = bookId
      this.bookPath = bookPath
      this.userEmail = userEmail
      this.idToken = idToken
      await this.updateNewEbookUrl()
      await this.refreshRecordEvent()
    }

    async updateNewEbookUrl(){
      // openNewEBook
      const openNewEBook = this.shadowRoot.getElementById("openNewEBook")
      const newWbLink =  await eBookSvc.getRecordEBookAmazon(this.bookPath, null, this.userEmail, this.idToken)
      openNewEBook.href = newWbLink
    }

    async addEventListeners() {
      // refreshRecord
      const refreshRecord = this.shadowRoot.getElementById("refreshRecord")
      if (refreshRecord) {
        refreshRecord.addEventListener("click", async (e) => {
          e.preventDefault()
          const invalidPopId = this.getInvalidPopId()
          if (invalidPopId) {
            window.location.href = invalidPopId
          } else {
            await this.refreshRecordEvent()
          }
        })
      }

      // openNewEBook
      const openNewEBook = this.shadowRoot.getElementById("openNewEBook")
      if (openNewEBook) {
        openNewEBook.addEventListener("click", async (e) => {
          e.preventDefault()
          const invalidPopId = this.getInvalidPopId()
          if (invalidPopId) {
            window.location.href = invalidPopId
          } else {
            window.open(openNewEBook.href)
          }
        })
      }
    }

    async refreshRecordEvent(){
      const obj = this
      let recordInfo = [];
      let recordResp = await eBookSvc.getClassRecord(obj.userEmail, obj.bookId);
      const recordResult = JSON.parse(recordResp);
      if (recordResult !== null) {
        recordInfo = recordResult.data.dataset;
      }


      let newHtml = "";
      for (const record of recordInfo) {
        if (record.file_ok){
          const ticks = record.ver;
          const date = new Date(ticks);
          const dateString = date.toLocaleString();
          const recordWebLink = await eBookSvc.getRecordEBookAmazon(obj.bookPath, record.subject, obj.userEmail, obj.idToken)

          newHtml += `
          <tr>
            <td>${record.subject}</td>
            <td data-content='時間'>${dateString}</td>
            <td data-content='功能'>
                <button class="deleteEbook" data-record="${record.subject}">刪除</button>
                <span></span>
                <a class="openEbook" id="openEbookUrl-${record.subject}" href="${recordWebLink}" target="_blank"><button class="openEbook" data-record="${record.subject}">開啟</button></a>
            </td>
          </tr>
    `
        }
      }
      this.shadowRoot.getElementById("ebookSelect").innerHTML = newHtml

      this.deleteEbookEvent()
      this.openRecordEbookEvent()

    }

    openRecordEbookEvent(){
      const openRecordBook = this.shadowRoot.querySelectorAll("a.openEbook")
      const obj = this
      openRecordBook.forEach((record) => {
        record.addEventListener("click", async function (e){
          const invalidPopId = obj.getInvalidPopId()
          if (invalidPopId) {
            window.location.href = invalidPopId
          } else {
            window.open(record.href)
          }
        })
      })
    }
    deleteEbookEvent(){
      const obj = this
      const deleteEbook = this.shadowRoot.querySelectorAll(".deleteEbook")
      deleteEbook.forEach((btn) => {
        btn.addEventListener("click", async function (e){
          const invalidPopId = obj.getInvalidPopId()
          if (invalidPopId) {
            window.location.href = invalidPopId
          } else {
            const subject = e.target.dataset.record;
            await eBookSvc.deleteClassRecords(obj.userEmail, obj.bookId, subject);
            let parentTr = btn.closest('tr');
            if (parentTr) parentTr.remove();
          }
        })
      })
    }


    getInvalidPopId(){
      if (!this.isLogin) {
        return "#un-login-pop"
      }

      return null
    }

  })
})(window)
