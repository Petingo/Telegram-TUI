import { apiId, apiHash } from './api-key.js'
import { TUI } from './tui.js'
import { Airgram, Auth, prompt, toObject } from 'airgram'

const useTui = true

export class Controller {
    constructor() {
        // This store all messages which are shown in the main message list 
        this.msgList = []

        // An map from userId -> user
        this.id2User = {}

        // An map from chatId -> chat
        this.id2Chat = {}

        if(useTui){
            this.tui = new TUI()
            this.tui.setController(this)
            this.tui.updateHint("Initializing...")
        }        
        
        this.airgram = new Airgram({
            apiId: apiId,
            apiHash: apiHash,
            command: "libtdjson",
            logVerbosityLevel: 1
        })
        
        this.airgram.use(new Auth({
            code: () => prompt('Please enter the secret code:\n'),
            phoneNumber: () => prompt('Please enter your phone number:\n')
        }))

        // update contact info
        this.airgram.api.getContacts().then(contacts => {
            this.contacts = toObject(contacts)
            this.contacts.userIds.map((userId, idx) => {
                this._updateUserInfo(userId)
            })
        })
        
        // update self information to `id2User`
        this.airgram.api.getMe().then(me => {
            this.id2User[me.id] = toObject(me)
            this.myId = me.id
        })
        
        this.airgram.api.getChats({
            limit: 15,
            offsetChatId: 0,
            offsetOrder: '9223372036854775807'
        }).then(chats=>{
            this.chats = toObject(chats)
            this.chats.chatIds.map((chatId, idx)=>{
                this._updateChatInfo(chatId)
            })
        }).then(()=>{
            this.tui.updateHint("Welcome Back!")
        })
        
        // Getting new messages
        this.airgram.on('updateNewMessage', async ({ update }) => {
            const { message } = update
            this._updateNewMessageHandler(message)
        })

        // Getting all updates
        this.airgram.use((ctx, next) => {
            if ('update' in ctx) {
                // console.log(`[all updates][${ctx._}]`, JSON.stringify(ctx.update))
            }
            return next()
        })
    }
    
    _id2Color(id){
        // 1677216 = 256 ^ 3
        return "#" + ((id % 16777216 * (id < 0 ? -1 : 1)).toString(16)).padStart(6, "0")
    }

    _updateUserInfo = async (userId) => {
        if(!useTui) console.log("_updateUserInfo()", userId)
        let userInfo = toObject(await this.airgram.api.getUser({ userId: userId }))
        
        let fullName = ""
        if (userInfo.firstName.length > 0) {
            fullName += userInfo.firstName
        }
        if (userInfo.lastName.length > 0) {
            if (fullName.length > 0) {
                fullName += ' '
            }
            fullName += userInfo.lastName
        }
        userInfo.fullName = fullName
        userInfo.color = this._id2Color(userId)

        this.id2User[userId] = userInfo
    }

    _updateChatInfo = async (chatId) => {
        if(!useTui) console.log("_updateChatInfo()", chatId)

        let chatInfo = toObject(await this.airgram.api.getChat({ chatId: chatId }))
        
        // other info
        chatInfo.color = this._id2Color(chatId)
        // don't know why, some chats have [] in position
        chatInfo.isArchieved = (chatInfo.positions.length == 0 || chatInfo.positions[0].list._ == 'chatListArchive')
        chatInfo.isGroupChat = (chatInfo.type._ == 'chatTypeSupergroup')

        // insert into map
        this.id2Chat[chatId] = chatInfo
        
        // notify UI
        if(!chatInfo.isArchieved){
            let title
            let color
            if(chatInfo.isGroupChat){
                title = chatInfo.title
                color = chatInfo.color
            } else {
                let userInfo = await this.getUserInfo(chatInfo.type.userId)
                title = userInfo.fullName
                color = userInfo.color
            }
            
            if(!useTui){
                console.log("addChat()", title, color, chatId, chatInfo.isArchieved)
                // TODO: [addChat() undefined undefined -604902730 false] 
            } else {
                if (title != undefined){
                    this.tui.addChat(title, color, chatId)
                }
            }
        }
        
    }

    getUserInfo = async (userId) => {
        if(!useTui) console.log("getUserInfo()", userId)
        if(this.id2User[userId] == undefined){
            await this._updateUserInfo(userId)
        }
        return this.id2User[userId]
    }

    getChatInfo = async (chatId) => {
        if(!useTui) console.log("getChatInfo()", chatId)
        if(this.id2Chat[chatId] == undefined){
            await this._updateChatInfo(chatId)
        }
        return this.id2Chat[chatId]
    }

    sendMsgByRefMsgId(refMsgId, content, replyToMsg=false){
        if(useTui){
            this.tui.screen.debug("sendMsg")
        }
        let refMsg = this.msgList[refMsgId]

        let param = {
            chatId: refMsg.chatId,
            inputMessageContent: {
                _: 'inputMessageText',
                text: {
                    _: 'formattedText',
                    text: content
                }
            }
        }
        if(replyToMsg){
            param.replyToMessageId = refMsg.id
        }
        this.airgram.api.sendMessage(param)
    }

    sendMsgByChatId(chatId, content){
        let param = {
            chatId: chatId,
            inputMessageContent: {
                _: 'inputMessageText',
                text: {
                    _: 'formattedText',
                    text: content
                }
            }
        }
        this.airgram.api.sendMessage(param)
    }

    async _updateNewMessageHandler(message) {
        if(!useTui) console.log(message)
        
        // here needs to refactor
        let chatId = message.chatId
        let chatInfo = await this.getChatInfo(chatId)
        
        if(chatInfo.isArchieved) return

        this.msgList.push(message)
        let getSenderNameAndColor = async () => {
            let senderName = ""
            let color = "white"
            if(message.senderId._ == 'messageSenderUser'){
                let userId = message.senderId.userId
                let userInfo = await this.getUserInfo(userId)
    
                senderName = userInfo.fullName
                color = userInfo.color

            } else if (message.senderId._ == 'messageSenderChat') {
                senderName = "SomeChat"
            }

            return [senderName, color]
        }

        let chatName, chatColor
        if(chatInfo.isGroupChat){
            chatName = chatInfo.title
            chatColor = chatInfo.color
        }

        let [senderName, senderColor] = await getSenderNameAndColor()
        let content

        try{
            switch(message.content._){
                case 'messageText':
                    content = message.content.text.text
                    break
                case 'messagePhoto':
                    content = "[Photo] " + message.content.caption.text
            }
            if(message.content.text.text){
                content = message.content.text.text
            }

        } catch(err) {
            content = "[Unsupported Message]"
        }

        if (useTui) {
            this.tui.updateMsg(content, senderName, senderColor, chatName, chatColor)
        } else {
            console.log(content, senderName, senderColor, chatName, chatColor)
        }
    }
}