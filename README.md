<div align="center">
  <h1>
    <img src="assets/icon.svg" width="32" height="32" 
         />
    Steam Registerkey Enhancer
  </h1>
</div>

<div align="center">

[![Author](https://img.shields.io/badge/Author-beerleexc-blue.svg)](https://github.com/beerleexc)
[![Release](https://img.shields.io/github/v/release/beerleexc/Steam-Registerkey-Enhancer?color=green)](https://github.com/beerleexc/Steam-Registerkey-Enhancer/releases)
[![MIT](https://img.shields.io/badge/license-MIT-orange.svg)](https://github.com/beerleexc/Steam-Registerkey-Enhancer/blob/main/LICENSE)
[![English](https://img.shields.io/badge/document-English-red.svg)](https://github.com/beerleexc/Steam-Registerkey-Enhancer/blob/main/README.EN.md)
[![支持](https://img.shields.io/badge/Windows-MacOS-navy.svg)](https://github.com/beerleexc/Steam-Registerkey-Enhancer/blob/main/README.md)
[![支持](https://img.shields.io/badge/Android-IOS-deeppink.svg)](https://github.com/beerleexc/Steam-Registerkey-Enhancer/blob/main/README.md)
</div>


# ✨ 项目简介

本脚本运行于 Steam 官方密钥激活页面，支持批量自动激活 CDK。自动识别杂乱文本中的有效CDK，支持数据导出，提供对应的 sub 查询功能。

# 📸 效果展示
##  批量激活面板
![折扣倒计时](assets/CleanShot_10.24.40.png)

将任意包含 CDK 的文本粘贴至输入框，脚本自动全局正则提取标准 XXXXX-XXXXX-XXXXX 格式密钥，自动过滤无效内容。

##  激活情况示例
![折扣倒计时](assets/test01.jpeg)

所有成功激活或解析出信息的密钥（如重复激活、已拥有等），右侧自动展示 SteamDB SubID，点击直达详情页，快速查询package构成、包含内容、激活限制。

##  数据导出示例
![折扣倒计时](assets/test02.jpg)
  
脚本支持一键导出所有激活记录，包含游戏名、Key、状态、时间、SubID、失败原因，方便归档对账：

• 导出 CSV：适配 Excel 查看，

• 导出 JSON：结构化原始数据，适合二次处理

• 复制纯文本：快速生成简洁日志

• 复制未使用：一键提取所有未激活剩余密钥

• 清空记录：清空本地所有激活缓存数据

# 📥 安装与使用

> [!TIP]
> **推荐搭配脚本管理器使用：**
> * **PC端**：推荐使用 [Tampermonkey](http://tampermonkey.net/)
> * **iOS端**：推荐使用 [Stay](https://apps.apple.com/cn/app/stay-for-safari-%E7%94%A8%E6%88%B7%E8%84%9A%E6%9C%AC%E4%B8%8E%E5%B9%BF%E5%91%8A%E6%8B%A6%E6%88%AA%E6%8F%92%E4%BB%B6/id1591620171)
> * **Steam客户端**：推荐使用 [脚本猫](https://scriptcat.org/zh-CN)
> ## [安装地址](https://greasyfork.org/zh-CN/scripts/605973-steam-registerkey-enhancer)
---

## 🐛 [问题反馈](#目录导航)
如有 Bug、功能建议，欢迎提交 [**Issues**](https://github.com/beerleexc/Steam-Registerkey-Enhancer/issues)

## 📝 [使用说明](#目录导航)

> [!note]
> **注意：**
> * 脚本仅请求 Steam 官方接口，不会上传你的密钥、登录凭证、个人数据至任何第三方服务器，全程本地存储，所有激活记录、运行缓存仅保存在当前浏览器本地localStorage。
> * 清理浏览器缓存、卸载脚本、无痕模式会清空所有记录，重要数据请提前导出备份。
> * Steam 对密钥激活存在严格的激活频次限制，过量激活会触发次数上限报错。

---

## 📄 [开源协议](#目录导航)
本项目基于[**MIT License**](https://github.com/beerleexc/Steam-Registerkey-Enhancer/blob/main/LICENSE)开源，欢迎学习与使用。


作者：**beerlee**  
版本：**1.1.2**
