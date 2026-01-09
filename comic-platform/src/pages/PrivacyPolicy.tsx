import React from 'react';
import {ChevronLeft} from 'lucide-react'
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
  const navigate= useNavigate();
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', lineHeight: '1.6' }}>
      <header style={{ borderBottom: '1px solid #eee', paddingBottom: '20px', marginBottom: '30px' }}>
         {/* ✅ 优化：去掉空background，扩大点击区域，样式更合理 */}
        <button 
          style={{ 
            border: 'none', 
            background: 'transparent', 
            cursor: 'pointer', 
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize:"16px",
            color: '#666',
            
          }} 
          onClick={() => navigate(-1)}
        >
          <ChevronLeft size={25} /> 返回
        </button>
        <h1 style={{ marginBottom: '10px' }}>ComicFlow 隐私政策</h1>
        <p style={{ color: '#666' }}>最后更新日期：2025年12月17日</p>
      </header>

      <section style={{ marginBottom: '30px' }}>
        <p>
          欢迎使用 ComicFlow。我们高度重视用户的隐私保护，本隐私政策旨在向您说明我们如何收集、使用、存储、共享和保护您的个人信息，以及您如何管理您的个人信息。请在使用我们的服务前，仔细阅读并理解本政策。
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ borderLeft: '4px solid #007bff', paddingLeft: '10px', marginBottom: '15px' }}>一、我们收集的信息</h2>
        <p>我们收集信息是为了向您提供优质的服务，并保障社区的良好氛围。信息的收集分为以下两类：</p>
        
        <div style={{ marginTop: '15px' }}>
          <h3 style={{ marginBottom: '10px' }}>1.1 您直接提供的信息</h3>
          <ul style={{ paddingLeft: '20px' }}>
            <li><strong>账户信息</strong>：当您注册账户时，会收集您的用户名、电子邮箱地址、密码。您后续可以补充头像、个人简介等资料。</li>
            <li><strong>内容信息</strong>：您在使用漫画翻译功能时上传、编辑、导出的图片；您在使用社区功能时发布、分享的帖子、评论、回复、点赞、收藏以及通过私信发送的文字、图片等内容。</li>
            <li><strong>社交信息</strong>：您主动建立的社交关系，例如关注列表、粉丝列表。</li>
          </ul>
        </div>
        
        <div style={{ marginTop: '15px' }}>
          <h3 style={{ marginBottom: '10px' }}>1.2 自动收集的信息</h3>
          <ul style={{ paddingLeft: '20px' }}>
            <li><strong>设备与日志信息</strong>：包括设备型号、操作系统版本、唯一设备标识符、IP地址、访问时间、服务使用日志等。</li>
            <li><strong>社区互动信息</strong>：我们可能会记录您与其他用户的互动频率、常访问的版块等匿名化数据，用于优化内容推荐。</li>
          </ul>
        </div>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ borderLeft: '4px solid #007bff', paddingLeft: '10px', marginBottom: '15px' }}>二、我们如何使用您的信息</h2>
        <p>我们严格遵守法律法规，将您的信息用于以下目的：</p>
        <ol style={{ paddingLeft: '20px' }}>
          <li><strong>核心功能服务</strong>：提供漫画翻译、编辑、保存功能，以及社区的发帖、互动、私信聊天功能。</li>
          <li><strong>服务维护与改进</strong>：进行数据分析和研究，以优化产品性能、改进用户体验。</li>
          <li><strong>安全与合规</strong>：用于身份验证、客户服务、安全防范、诈骗监测，以预防、发现和调查可能存在的非法行为，并遵守法律义务。</li>
          <li><strong>信息推送</strong>：向您发送与服务相关的通知（如私信到达提醒、评论回复提醒、系统更新）或您可能感兴趣的社区内容推荐（您可以在设置中管理）。</li>
        </ol>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ borderLeft: '4px solid #007bff', paddingLeft: '10px', marginBottom: '15px' }}>三、社区及聊天功能特别说明</h2>
        
        <div style={{ marginTop: '15px' }}>
          <h3 style={{ marginBottom: '10px' }}>3.1 公开内容与互动</h3>
          <p>您发布的帖子、评论、用户名、头像及个人简介等信息是公开的，其他用户可以查看并与您互动。请谨慎分享任何个人敏感信息。</p>
        </div>
        
        <div style={{ marginTop: '15px' }}>
          <h3 style={{ marginBottom: '10px' }}>3.2 私信聊天</h3>
          <ul style={{ paddingLeft: '20px' }}>
            <li><strong>内容存储</strong>：为确保聊天连续性，您的私信聊天记录会加密存储于我们的服务器上，直到您主动删除对话或账户注销。</li>
            <li><strong>隐私控制</strong>：您可以在隐私设置中管理"谁可以向我发送私信"（例如：所有人、仅我关注的人、关闭私信）。</li>
            <li><strong>安全提醒</strong>：请注意，私信是您与另一方用户的直接沟通。请勿通过私信分享密码、财务信息等敏感内容，谨防诈骗。如收到骚扰或不良信息，请使用举报功能。</li>
          </ul>
        </div>
        
        <div style={{ marginTop: '15px' }}>
          <h3 style={{ marginBottom: '10px' }}>3.3 内容管理</h3>
          <p>您可以随时编辑或删除自己发布的内容（帖子、评论）。但请注意，您删除前其他用户可能已经进行了转发或引用。</p>
        </div>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ borderLeft: '4px solid #007bff', paddingLeft: '10px', marginBottom: '15px' }}>四、图片处理说明</h2>
        
        <div style={{ marginTop: '15px' }}>
          <h3 style={{ marginBottom: '10px' }}>4.1 图片上传与存储</h3>
          <p>您上传的图片将加密存储在云服务器上，以便您在多设备间同步和访问。</p>
        </div>
        
        <div style={{ marginTop: '15px' }}>
          <h3 style={{ marginBottom: '10px' }}>4.2 图片编辑、导出与责任</h3>
          <p>您可以使用我们的工具对图片进行编辑（如翻译文字）。处理后的图片可导出至本地。您需确保对图片拥有合法权利或已获授权，使用行为不得侵犯他人权益。</p>
        </div>
        
        <div style={{ marginTop: '15px' }}>
          <h3 style={{ marginBottom: '10px' }}>4.3 图片删除</h3>
          <p>您可以在应用内删除上传的图片。删除后，我们将从业务服务器中移除该图片的访问链接，但受限于系统架构，其可能在备份中残留一段时间后被自动清除。</p>
        </div>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ borderLeft: '4px solid #007bff', paddingLeft: '10px', marginBottom: '15px' }}>五、信息披露</h2>
        <p>我们不会对外公开披露您的个人信息，但以下情况除外：</p>
        <ol style={{ paddingLeft: '20px' }}>
          <li>获得您的明确单独同意。</li>
          <li>根据法律法规、司法程序、政府主管部门的强制性要求。</li>
          <li>为维护ComicFlow、用户或公众的合法权益免遭损害所必要。</li>
          <li>在涉及合并、收购或破产清算时，如涉及到个人信息转让，我们会要求新的持有您信息的公司、组织继续受此隐私政策的约束。</li>
        </ol>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ borderLeft: '4px solid #007bff', paddingLeft: '10px', marginBottom: '15px' }}>六、数据安全</h2>
        <p>我们采用符合行业标准的安全技术和管理措施（如加密传输、访问控制）来保护您的信息。但请注意，任何安全措施都无法做到100%无懈可击。请您妥善保管自己的账户密码。</p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ borderLeft: '4px solid #007bff', paddingLeft: '10px', marginBottom: '15px' }}>七、您的权利</h2>
        <p>您对您的个人信息享有以下权利，您可以通过设置页面或联系我们行使：</p>
        <ol style={{ paddingLeft: '20px' }}>
          <li><strong>访问与更正</strong>：查询、访问您的个人信息，并进行更新。</li>
          <li><strong>删除权</strong>：删除您发布的内容或您的账户（法律法规要求我们保留的情况除外）。</li>
          <li><strong>撤回同意与管理通知</strong>：在"设置"中更改隐私选项、关闭特定功能的数据收集或通知推送。</li>
          <li><strong>注销账户</strong>：注销您的账户。一旦注销，我们将停止为您提供服务，并根据适用法律在合理时间内删除或匿名化处理您的个人信息。</li>
          <li><strong>投诉举报</strong>：对社区内的不良内容或行为进行举报。</li>
        </ol>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ borderLeft: '4px solid #007bff', paddingLeft: '10px', marginBottom: '15px' }}>八、未成年人保护</h2>
        <p>若您是未满18周岁的未成年人，请在您的父母或其他监护人的陪同下阅读本政策，并在取得他们同意后使用我们的服务。对于经监护人同意而收集的未成年人个人信息，我们只会在法律允许的范围内加以使用。</p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ borderLeft: '4px solid #007bff', paddingLeft: '10px', marginBottom: '15px' }}>九、隐私政策的变更</h2>
        <p>我们可能会适时更新本政策。更新后，我们会在软件内发布新版本，并通过显著方式（如站内通知）提醒您。若您继续使用我们的服务，即表示同意受修订后的政策约束。</p>
      </section>

      <section style={{ marginBottom: '30px', backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '5px' }}>
        <h2 style={{ borderLeft: '4px solid #28a745', paddingLeft: '10px', marginBottom: '15px' }}>十、联系我们</h2>
        <p>如果您对本隐私政策或您的个人信息处理有任何疑问、意见或投诉，请通过以下方式与我们联系：</p>
        <p><strong>邮箱：</strong> 353489365@qq.com</p>
        <p>我们将尽快在15个工作日内予以审核和处理。</p>
      </section>
    </div>
  );
};

export default PrivacyPolicy;