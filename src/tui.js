const blessed = require('blessed')

export class TUI {
  constructor() {
    this.controller = undefined

    //=============//
    // Init Screen //
    //=============//
    this.screen = blessed.screen({
      smartCSR: true,
      fullUnicode: true,
      debug: true
    })
    this.screen.title = "Telegram"

    //========================//
    // Init Main Message List //
    //========================//
    this.mainMsgList = blessed.list({
      top: 0,
      left: 'center',
      width: '100%',
      height: this.screen.height - 2,
      tags: true,
      style: {
        fg: 'white',
        selected: {
          bg: 'cyan'
        }
      },
      scrollable: true,

    });
    
    this.mainMsgList.cursorPosition = 0
    this.mainMsgList.cursorIdx = 0
    this.mainMsgList.msgCounter = 0

    this.mainMsgList.key('down', (ch, key)=>{
      this.mainMsgList.down(1)

      if(this.mainMsgList.cursorIdx != this.mainMsgList.msgCounter - 1){
        this.mainMsgList.cursorIdx += 1
        this.mainMsgList.select(this.mainMsgList.cursorIdx) // this doesn't work ?
      }

      if(this.mainMsgList.cursorPosition != this.mainMsgList.height - 1){
        this.mainMsgList.cursorPosition += 1
      }

      this.screen.debug("cursorPosition", this.mainMsgList.cursorPosition, "/", this.mainMsgList.height - 1)
      this.screen.debug("cursorIdx", this.mainMsgList.cursorIdx)

      this.screen.render()
    })

    this.mainMsgList.key('up', (ch, key)=>{
      this.mainMsgList.up(1)

      if(this.mainMsgList.cursorIdx != 0){
        this.mainMsgList.cursorIdx -= 1
        this.mainMsgList.select(this.mainMsgList.cursorIdx) // this doesn't work ?
      }

      if(this.mainMsgList.cursorPosition != 0){
        this.mainMsgList.cursorPosition -= 1
      }

      this.screen.debug("cursorPosition", this.mainMsgList.cursorPosition)
      this.screen.debug("cursorIdx", this.mainMsgList.cursorIdx)

      this.screen.render()
    })

    //===============//
    // Init Hint Box //
    //===============//
    this.hintBox = blessed.box({
      top: this.screen.height - 2,
      left: 'center',
      width: '100%',
      height: 1,
      tags: true,
      input: true,
      style: {
        fg: 'gray',
      },
      content: "Welcome Back!"
    });

    //==============//
    // Init Cmd Box //
    //==============//
    this.cmdBox = blessed.textarea({
      top: this.screen.height - 1,
      left: 'center',
      width: '100%',
      height: 1,
      tags: true,
      input: true,
      style: {
        fg: 'white'
      }
    });

    //===========//
    // Chat List //
    //===========//
    this.chatList = blessed.list({
      title: 'Send to',
      top: 'center',
      left: 'center',
      width: '50%',
      height: '60%',
      tags: true,
      style: {
        fg: 'white',
        selected: {
          bg: 'cyan'
        }
      },
      border: {
        type: 'line'
      },
      keys: true
    });

    this.chatList.on("select", (item, idx)=>{
      this.screen.remove(this.chatList)
      this.updateHint("Sending to " + item.content + ":")
      
      this.cmdBox.currentJob = 'SEND_MSG_BY_CHAT_ID'
      this.cmdBox.jobParam = {}
      this.cmdBox.jobParam.chatId = this.chatListIdx2chatId[idx]

      this.cmdBox.clearValue()
      this.cmdBox.focus()
      this.cmdBox.readInput()

      this.screen.render()
    })

    this.chatListIdx2chatId = {}
    this.chatListIdx = 0


    this.screen.append(this.mainMsgList);
    this.screen.append(this.hintBox);
    this.screen.append(this.cmdBox);

    this.mainMsgList.focus()

    this.screen.render();

    //======================//
    // All the key bindings //
    //======================//
    this.screen.key(['C-c'], (ch, key) => {
      return process.exit(0);
    });

    //====================//
    // Send/Reply message //
    //====================//
    this.mainMsgList.key(['r'], (ch, key) => {
      
      this.cmdBox.currentJob = 'SEND_MSG_BY_REF_MSG_ID'
      this.cmdBox.jobParam = {}
      this.cmdBox.jobParam.isReply = true

      this.cmdBox.clearValue()
      this.cmdBox.focus()
      this.cmdBox.readInput()

      this.updateHint('Reply to ' + this.mainMsgList.getItem(this.mainMsgList.cursorIdx).content + ":")

    })
    this.mainMsgList.key(['s'], (ch, key) => {
      this.cmdBox.currentJob = 'SEND_MSG_BY_REF_MSG_ID'
      this.cmdBox.jobParam = {}
      this.cmdBox.jobParam.isReply = false

      this.cmdBox.clearValue()
      this.cmdBox.focus()
      this.cmdBox.readInput()

      this.updateHint('Send to ' + this.mainMsgList.getItem(this.mainMsgList.cursorIdx).content + ":")
    })

    this.cmdBox.key(['enter'], (ch, key) => {
      switch(this.cmdBox.currentJob){
        case 'SEND_MSG_BY_REF_MSG_ID':
          // TODO: the this.mainMsgList.cursorIdx should be replace by chat id 
          this.controller.sendMsgByRefMsgId(this.mainMsgList.cursorIdx, this.cmdBox.value, this.cmdBox.jobParam.isReply)
          this.mainMsgList.focus()
          break

        case 'SEND_MSG_BY_CHAT_ID':
          let chatId = this.cmdBox.jobParam.chatId
          let content = this.cmdBox.value
          this.controller.sendMsgByChatId(chatId, content)
          this.mainMsgList.focus()
          break
      }
      this.updateHint("Welcome Back!")
    })

    // open chat list
    this.mainMsgList.key('c', (ch, key)=>{
      this.screen.append(this.chatList)
      this.chatList.focus()
      this.screen.render()
    })

    this.chatList.key('escape', (ch, key)=>{
      this.screen.remove(this.chatList)
      this.mainMsgList.focus()
      this.updateHintDefault()
      this.screen.render()
    })


    this.cmdBox.key(['escape'], (ch, key)=>{
      this.mainMsgList.focus()
      this.updateHintDefault()
    })
    this.screen.key(['escape'], (ch, key)=>{
      this.mainMsgList.focus()
      this.updateHintDefault()
    })
  }

  setController(controller){
    this.controller = controller
  }

  addChat(title, color, chatId){
    this.screen.debug("addChat()", title, color, chatId)
    this.chatListIdx2chatId[this.chatListIdx++] = chatId
    this.chatList.add(`{${color}-fg}${title}{/${color}-fg}`)
  }

  updateMsg(content, senderName, senderColor, chatName, chatColor) {
    let msgStr = ""
    if(chatName != undefined && chatName.length > 0){
      msgStr = `[{${chatColor}-fg}{bold}` + chatName + `{/bold}{/${chatColor}-fg}] `
    }
    msgStr += `{${senderColor}-fg}{bold}` + senderName + `{/bold}{/${senderColor}-fg} `
    msgStr += content

    this.mainMsgList.add(msgStr)
    this.mainMsgList.msgCounter += 1

    // auto scroll
    if(this.mainMsgList.cursorPosition != 0) {
      // -1 here to make it say at [1] instead of [0]
      let offsetMsgEnd = this.mainMsgList.msgCounter - this.mainMsgList.cursorIdx - 1
      let offsetViewEnd = this.mainMsgList.height - this.mainMsgList.cursorPosition - 1
      if(offsetMsgEnd >= offsetViewEnd){
        this.screen.debug(offsetViewEnd)
        this.mainMsgList.move(offsetViewEnd)
        this.mainMsgList.move(-offsetViewEnd)  
        this.mainMsgList.cursorPosition -= 1
      }
    }
    
    // update hint info
    let notShowedMsgAmount = this.mainMsgList.msgCounter - (this.mainMsgList.height - this.mainMsgList.cursorPosition + this.mainMsgList.cursorIdx)
    if(notShowedMsgAmount > 0){
      this.hintBox.content = `...${notShowedMsgAmount} more`
    } else {
      this.hintBox.content = ""
    }
    this.screen.render()
  }

  updateHint(hint){
    this.hintBox.content = hint
    this.screen.render()
  }

  updateHintDefault(){
    this.hintBox.content = "Welcome Back!"
    this.screen.render()
  }

}