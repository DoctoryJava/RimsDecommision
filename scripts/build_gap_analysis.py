# -*- coding: utf-8 -*-
"""对照《功能清单.xlsx》生成业务场景.xlsx 的补充：
1) 新增「功能清单对照」sheet（现有 / 未做 / 处理去向）
2) 主表末尾追加「后续 / 二期（未计入 120.5 人天）」区
"""
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

GN = '业务场景.xlsx'
FL = '功能清单.xlsx'

# ---------- 读取功能清单 ----------
fwb = openpyxl.load_workbook(FL, data_only=True)
fws = fwb['Sheet1']
rows = {}  # row -> [阶段,模块,业务场景,关键功能,具体功能,描述]
for r in range(2, fws.max_row + 1):
    vals = [fws.cell(row=r, column=c).value for c in range(1, 7)]
    if vals[0]:
        rows[r] = vals

# ---------- 分类 (row -> (status, note)) ----------
# status: cover 已覆盖 | part 部分覆盖 | p2 二期/后续 | ai AI后续 | noc 非当前范围忽略
CLS = {
 2: ('cover','现规划经 勾选表→ETL/归档执行 结构化入库'),
 3: ('p2','在线附件迁移已含；离线介质/压缩包批量导入为二期增强'),
 4: ('cover','转换/脱敏/附件URL/ETL 规则配置已含'),
 5: ('cover','归档执行/批次管理/结果查看/失败重试已含'),
 6: ('p2','二期·迁移完整性（迁移前基准记录）'),
 7: ('p2','二期·迁移完整性（迁移后比对）'),
 8: ('p2','二期·迁移完整性（一致性报告）'),
 9: ('cover','归档对象/归档集(r_archive_set)等已建模'),
 10:('noc','传统档案目录/章节折叠夹，结构化归档不适用，忽略'),
 11:('cover','Azure 中国境内部署'),
 12:('cover','字段加解密 + 存储/传输加密'),
 13:('cover','Key Vault 密钥管理'),
 14:('p2','结构化字段查询已有；跨档案 OCR 全文关键词为二期'),
 15:('cover','按系统检索已含'),
 16:('cover','按业务时间检索已含'),
 17:('cover','列表展示/排序/关键字段已含'),
 18:('cover','附件 SAS 直链在线预览'),
 19:('cover','审计日志(操作/删除)已含'),
 20:('cover','查询行为日志已含'),
 21:('p2','二期·检索导出(导出操作日志)'),
 22:('p2','二期·归档统计台账(按系统)'),
 23:('p2','二期·归档统计台账(按时间)'),
 24:('p2','二期·归档统计台账(按类型)'),
 25:('p2','二期·台账报表导出'),
 26:('cover','基础角色权限配置已含'),
 27:('cover','用户账号管理已含'),
 28:('cover','企业 SSO 集成已含'),
 29:('cover','SSO 身份→用户/角色关联已含'),
 30:('cover','登录状态/失效/异常访问基础控制已含'),
 31:('cover','Schema Registry 统一元数据模型驱动'),
 32:('cover','来源系统编码/绑定已含'),
 33:('noc','在运系统冷数据识别，不适用退役，忽略'),
 34:('noc','在运冷数据周期接入，不适用退役，忽略'),
 35:('ai','AI 整组，二期后评估'),
 36:('p2','二期·元数据批量补全/修正工具'),
 37:('noc','在运增量同步，不适用退役，忽略'),
 38:('noc','在运业务事件触发同步，忽略'),
 39:('noc','在运文件增量同步，忽略'),
 40:('noc','在运冷数据分类归档，忽略'),
 41:('noc','在运冷数据生命周期，忽略'),
 42:('p2','二期·删除审批与操作留痕(后期再做)'),
 43:('p2','二期·保留策略变更审批流(随#3)'),
 44:('cover','ETL→标准归档对象转换已含'),
 45:('cover','归档规则自动应用已含'),
 46:('part','执行结果核对已含；深度完整性比对见二期#6-8'),
 47:('p2','二期·保留到期自动删除'),
 48:('p2','二期·Legal Hold 冻结'),
 49:('noc','冷热分层属在运冷数据承接，忽略'),
 50:('p2','二期·存储策略优化(低优先)'),
 51:('cover','敏感字段标识+脱敏规则配置(字段级核心)已含'),
 52:('part','手动选择脱敏字段为二期增强'),
 53:('part','脱敏策略按记录/角色生效为二期增强'),
 54:('p2','二期·脱敏预览'),
 55:('p2','二期·数据备份管理(基建)'),
 56:('p2','二期·异地灾备(基建)'),
 57:('p2','二期·恢复演练(基建)'),
 58:('p2','二期·个性化页面(可选)'),
 59:('p2','二期·自定义展示字段'),
 60:('p2','二期·检索条件保存复用'),
 61:('p2','二期·个人视图保存'),
 62:('p2','二期·页面模板管理'),
 63:('part','动态查询已支持多字段组合筛选；复杂组合/精准入二期'),
 64:('part','同#63'),
 65:('p2','二期·模糊全文/拼音检索'),
 66:('p2','二期·加密字段导出控制(检索导出)'),
 67:('p2','二期·检索文档结果导出'),
 68:('p2','二期·查询性能优化(基建)'),
 69:('p2','二期·脱敏日志记录'),
 70:('p2','二期·权限审计与复核'),
 71:('cover','标准 DB 连接(迁移用)已含'),
 72:('cover','标准文件/对象存储连接(附件)已含'),
 73:('p2','二期·第三方集成工具适配'),
 74:('part','源系统编码已建立；交互格式规范增强入二期'),
 75:('p2','二期·统一数据交互格式规范'),
 76:('p2','二期·标准系统接口能力'),
 77:('p2','二期·连接器模板库与复用'),
 78:('p2','二期·连接器状态监控'),
 79:('p2','二期·连接器日志与审计'),
 80:('p2','二期·系统监控告警(DevOps)'),
 81:('p2','二期·系统稳定性保障(DevOps/基建)'),
 82:('p2','二期·记录级权限控制'),
 83:('p2','二期·字段级权限控制'),
 84:('p2','二期·权限申请与审批'),
 85:('p2','二期·权限变更审批流'),
}

# AI 自动归类（Phase3 全部行，未在 CLS 里的都归 ai）
for rn, vals in rows.items():
    if 'Phase3' in vals[0]:
        CLS.setdefault(rn, ('ai', 'AI 智能化整组，二期后评估，未逐条确认'))
missing = [rn for rn in rows if rn not in CLS]
if missing:
    raise SystemExit('缺少分类的行: %s' % missing)

F_STAGE = {
 'cover': ('已覆盖','现规划内（已计入 120.5 人天）'),
 'part':  ('部分覆盖','现规划含基础，增强入二期'),
 'p2':    ('未覆盖','二期 / 后续（本次确认：缓/后期）'),
 'ai':    ('未覆盖','AI 智能化 · 后续（未逐条确认）'),
 'noc':   ('非当前范围','不适用退役归档 · 忽略'),
}

wb = openpyxl.load_workbook(GN)
main = wb['按菜单拆分功能与场景']

# ==================================================================
# 1) 主表末尾追加「后续 / 二期」区
# ==================================================================
thin = Side(style='thin', color='BFBFBF')
border = Border(left=thin, right=thin, top=thin, bottom=thin)
hdr_fill = PatternFill('solid', fgColor='DDEBF7')
title_fill = PatternFill('solid', fgColor='FFF2CC')
ai_fill = PatternFill('solid', fgColor='FCE4D6')
noct_fill = PatternFill('solid', fgColor='EDEDED')
center = Alignment(horizontal='center', vertical='center', wrap_text=True)
left = Alignment(horizontal='left', vertical='center', wrap_text=True)

start = main.max_row + 2  # 空一行
main.cell(row=start, column=1,
          value='后续 / 二期（未计入当前合计 120.5 人天）— 对照《功能清单.xlsx》确认未覆盖、本次按“缓/后期”保留的功能').font = Font(bold=True, size=12)
main.cell(row=start, column=1).fill = title_fill
hdr = ['前端菜单','功能分组（操作步骤）','步骤','业务功能','技术功能（服务/实现层）',
       'BA','前端(React)','后端API(.NET)','数据(Databricks)','QA','技术要点 / 备注']
hr = start + 1
for c, h in enumerate(hdr, 1):
    cell = main.cell(row=hr, column=c, value=h)
    cell.font = Font(bold=True); cell.fill = hdr_fill; cell.border = border; cell.alignment = center

def add(rows_in, r0):
    for ri, val in enumerate(rows_in):
        r = r0 + ri
        vals = list(val[:5]) + ['-','-','-','-','-'] + [val[5]]
        for c, v in enumerate(vals, 1):
            cell = main.cell(row=r, column=c, value=v)
            cell.border = border
            cell.alignment = left if c in (4,5,11) else center
            if val[2]:  # flag: 'P2' normal / 'AI' yellow / 'NOC' grey
                f = {'AI': ai_fill, 'NOC': noct_fill}.get(val[2])
                if f: cell.fill = f
    return r0 + len(rows_in)

rows2 = [
 ('—','二期 · 迁移完整性','—','迁移数据完整性校验（迁移前基准记录+迁移后比对+一致性报告）','清单 6/7/8 · 退役合规审计','P2'),
 ('—','二期 · 合规保留','—','Legal Hold 冻结（涉诉/审计/合规调查中暂停删除与修改）','清单 48','P2'),
 ('—','二期 · 到期处置','—','保留到期自动删除 + 删除/保留策略变更审批留痕','清单 47/42/43 · 现规划为校验后手动删除','P2'),
 ('—','二期 · 检索导出','—','检索结果导出(Excel/CSV/PDF)+加密字段导出控制+导出审计','清单 67/66/21','P2'),
 ('—','二期 · 统计台账','—','归档统计台账(按系统/时间/类型统计容量)+报表导出','清单 22-25','P2'),
 ('—','二期 · 元数据治理','—','元数据批量补全/修正工具','清单 36','P2'),
 ('—','二期 · 全文检索','—','全文/关键词跨档案检索(标题/元数据/OCR)','清单 14','P2'),
 ('—','二期 · 细粒度权限','—','记录级/字段级数据访问权限 + 权限申请/变更审批流','清单 82-85','P2'),
 ('—','二期 · 脱敏增强','—','手动选脱敏字段 / 策略按角色生效 / 脱敏预览 + 脱敏日志','清单 51-54/69 · 核心脱敏已含','P2'),
 ('—','二期 · 离线包导入','—','非结构化离线介质/压缩包批量导入增强','清单 3 · 在线附件迁移已含','P2'),
 ('—','二期 · 备份恢复','—','数据备份管理 / 异地灾备 / 恢复演练','清单 55-57 · 基建类','P2'),
 ('—','二期 · 存储性能','—','存储策略优化 / 查询性能优化 / 系统监控告警 / 稳定性保障','清单 50/68/80/81','P2'),
 ('—','二期 · 集成连接器','—','第三方集成工具适配 / 标准接口 / 连接器模板与监控审计','清单 73/75-79','P2'),
 ('—','二期 · 个性化','—','个性化页面/视图/检索条件保存/页面模板(可选)','清单 58-62','P2'),
 ('—','后续 · AI 智能化(整组)','—','AI：智能解析/自动分类/语义检索/自然语言问答/智能报表/风险预警等','清单 Phase3 全组 · 未逐条确认，二期后评估','AI'),
 ('—','忽略 · 非当前范围','—','在运系统增量同步 / 在运冷数据识别与接入 / 冷数据分类与生命周期 / 档案目录','不适用于退役归档，忽略','NOC'),
]
r3 = add(rows2, hr + 1)
note_cell = main.cell(row=r3+1, column=1,
    value='说明：本区为对照《功能清单》识别出的“现规划未覆盖/缺口”项，经确认为二期或后续，均未计入上方合计 120.5 人天。')
note_cell.font = Font(italic=True, color='808080')

# ==================================================================
# 2) 新增「功能清单对照」sheet
# ==================================================================
if '功能清单对照' in wb.sheetnames:
    del wb['功能清单对照']
cmp = wb.create_sheet('功能清单对照')
cmp.title = '功能清单对照'
t = cmp.cell(row=1, column=1, value='《功能清单》× 现规划(业务场景.xlsx)对照表 · 范围=退役归档主线')
t.font = Font(bold=True, size=13)
t.fill = title_fill
sub = cmp.cell(row=2, column=1, value='口径：现状以 业务场景.xlsx 现有规划（120.5人天已含步骤）为“现有”；未覆盖项经确认归二期/后续或忽略；AI 整组后续未逐条确认。')
sub.font = Font(italic=True, color='808080')
hdr2 = ['功能清单·阶段','功能模块','业务场景(清单)','关键功能','具体功能',
        '现状(对照现规划)','处理 / 去向','备注']
for c, h in enumerate(hdr2, 1):
    cell = cmp.cell(row=3, column=c, value=h)
    cell.font = Font(bold=True); cell.fill = hdr_fill; cell.border = border; cell.alignment = center

colors = {'已覆盖': None, '部分覆盖': 'FFF2CC', '未覆盖': 'FCE4D6',
          'AI 智能化 · 后续（未逐条确认）'.split(' ')[0]: 'FCE4D6'}
rr = 4
for rn in sorted(rows):
    stage, mod, biz, keyf, func, desc = rows[rn]
    st, note = CLS.get(rn, ('p2',''))
    stlabel, treat = F_STAGE[st]
    row = [stage, mod, biz, keyf, func, stlabel, treat, note]
    for c, v in enumerate(row, 1):
        cell = cmp.cell(row=rr, column=c, value=v)
        cell.border = border
        cell.alignment = left if c in (2,3,4,5,8) else center
    if stlabel == '部分覆盖': cmp.cell(row=rr, column=6).fill = PatternFill('solid', fgColor='FFF2CC')
    elif stlabel == '未覆盖': cmp.cell(row=rr, column=6).fill = PatternFill('solid', fgColor='FCE4D6')
    elif st == 'noc': cmp.cell(row=rr, column=6).fill = PatternFill('solid', fgColor='EDEDED')
    rr += 1

widths = {'A':16,'B':22,'C':26,'D':22,'E':26,'F':14,'G':26,'H':40}
for col, w in widths.items(): cmp.column_dimensions[col].width = w

wb.save(GN)
print('saved', GN)
print('main rows now', main.max_row, 'sheets', wb.sheetnames)
