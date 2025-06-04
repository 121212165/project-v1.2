import axios from 'axios';
import { appConfig } from '../config/index.js';
import { logInfo, logError } from '../utils/logger.js';
import { WechatUserInfo } from '../types/index.js';

export class WechatService {
  private static readonly WECHAT_API_BASE = 'https://api.weixin.qq.com';
  
  /**
   * 通过授权码获取访问令牌
   */
  static async getAccessToken(code: string): Promise<{
    access_token: string;
    openid: string;
    unionid?: string;
  }> {
    try {
      const response = await axios.get(`${this.WECHAT_API_BASE}/sns/oauth2/access_token`, {
        params: {
          appid: appConfig.wechat.appId,
          secret: appConfig.wechat.appSecret,
          code,
          grant_type: 'authorization_code'
        }
      });

      if (response.data.errcode) {
        throw new Error(`微信API错误: ${response.data.errmsg}`);
      }

      return response.data;
    } catch (error) {
      logError('获取微信访问令牌失败', error);
      throw new Error('微信登录失败，请重试');
    }
  }

  /**
   * 获取微信用户信息
   */
  static async getUserInfo(accessToken: string, openid: string): Promise<WechatUserInfo> {
    try {
      const response = await axios.get(`${this.WECHAT_API_BASE}/sns/userinfo`, {
        params: {
          access_token: accessToken,
          openid,
          lang: 'zh_CN'
        }
      });

      if (response.data.errcode) {
        throw new Error(`微信API错误: ${response.data.errmsg}`);
      }

      return {
        openid: response.data.openid,
        unionid: response.data.unionid,
        nickname: response.data.nickname,
        avatar: response.data.headimgurl,
        gender: response.data.sex
      };
    } catch (error) {
      logError('获取微信用户信息失败', error);
      throw new Error('获取微信用户信息失败');
    }
  }

  /**
   * 验证微信授权码并获取用户信息
   */
  static async validateCodeAndGetUserInfo(code: string): Promise<WechatUserInfo> {
    const tokenData = await this.getAccessToken(code);
    const userInfo = await this.getUserInfo(tokenData.access_token, tokenData.openid);
    
    // 如果有unionid，使用unionid，否则使用openid
    if (tokenData.unionid) {
      userInfo.unionid = tokenData.unionid;
    }
    
    logInfo('微信用户信息获取成功', {
      openid: userInfo.openid,
      unionid: userInfo.unionid,
      nickname: userInfo.nickname
    });
    
    return userInfo;
  }
}