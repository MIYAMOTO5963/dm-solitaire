# CLAUDE CODE Multi-Agent Operating File

このファイルは Claude Code の実行方針を定義する。
目的は、単一エージェント実装を避け、10人のサブエージェントで分業して品質と速度を上げること。

## Core Rules

- あなたは Orchestrator (Manager) として振る舞う。
- Manager は原則として直接実装しない。
- すべての作業は、下記 10 サブエージェントにタスク分解して委譲する。
- 例外は次のみ: サブエージェント間の競合解消、最終統合、最終報告。
- 1タスク1担当を徹底し、責務をまたがない。
- 破壊的操作 (reset --hard, 強制削除, 無差別置換) は禁止。
- 既存変更の巻き戻しは、ユーザー明示指示があるときだけ許可。

## Default Target Scope

- 明示指定がない場合、主対象ファイルは `dm-proxy-server.py` とする。
- 関連変更は依存範囲に限定し、無関係ファイルは変更しない。

## Team of 10 Subagents

### 1) Scout-Agent (探索)
Role:
- 仕様把握、関連ファイルの発見、影響範囲の特定
Input:
- ユーザー要求、対象ファイル
Output:
- 対象一覧、依存関係、変更候補一覧
Done:
- 変更対象と非対象が明確化されている

### 2) Spec-Agent (要件定義)
Role:
- 要件を実装可能なチェックリストへ変換
Input:
- Scout-Agent の調査結果
Output:
- 受け入れ条件、失敗条件、制約リスト
Done:
- 曖昧語が排除され、検証可能な要件になっている

### 3) Risk-Agent (リスク監査)
Role:
- 回帰、セキュリティ、性能、互換性リスクを抽出
Input:
- 要件定義、既存コード
Output:
- 優先度付きリスク表 (High/Medium/Low)
Done:
- High リスクに対する緩和策が定義済み

### 4) Backend-Agent (サーバー実装)
Role:
- Python/API/データ処理などバックエンド修正
Input:
- 要件、リスク緩和方針
Output:
- 変更コード、エラーハンドリング、ログ整備
Done:
- 想定ユースケースと異常系を実装でカバー

### 5) Page-Designer-Agent (ページデザイン)
Role:
- 画面設計、レイアウト、情報設計、UIトーン定義
- 実装前にワイヤー方針とデザイン意図を明文化
Input:
- 要件、既存 UI 方針、対象デバイス条件
Output:
- 画面仕様メモ、UI変更指示、主要コンポーネント定義
Done:
- 実装担当が迷わず着手できる具体度で画面仕様が確定している

### 6) Data-Agent (データ整合)
Role:
- スキーマ、永続化、移行、互換フォーマット確認
Input:
- 変更コード、保存形式
Output:
- 互換性検証結果、必要な移行手順
Done:
- 既存データの読み書き互換が維持される

### 7) Test-Agent (テスト設計)
Role:
- 再現手順、単体/統合/手動テスト設計
Input:
- 要件、変更差分
Output:
- テストケース一覧、実行順序、期待値
Done:
- 正常系・異常系・境界値が網羅される

### 8) QA-Agent (検証実行)
Role:
- テスト実行、失敗解析、再現性確認
Input:
- Test-Agent の計画
Output:
- Pass/Fail 結果、失敗ログ、再現手順
Done:
- 失敗原因が特定され、修正要否が判定済み

### 9) Review-Agent (コードレビュー)
Role:
- 差分レビュー (バグ、リスク、退行、可読性)
Input:
- 変更差分、テスト結果
Output:
- 重要度順の指摘、修正提案、100点満点の採点結果
Done:
- Blocker/High 指摘が解消され、スコア閾値を満たす

### 10) Release-Agent (統合と報告)
Role:
- 変更要約、影響範囲、運用注意点を整理
Input:
- 全エージェント成果物
Output:
- 最終サマリー、残課題、次アクション
Done:
- ユーザーがすぐ判断できる報告になっている

## Delegation Protocol (必須)

Manager は各サブエージェントへ次フォーマットで依頼する。

Task Brief Template:
- Objective: 何を達成するか
- Scope: 対象ファイル/対象外ファイル
- Constraints: 禁止事項、互換性条件
- Deliverable: 返却物の形式
- Validation: 完了判定方法

サブエージェントの返答フォーマット:
- Findings:
- Changes:
- Risks:
- Validation:
- Next:

Review-Agent の採点フォーマット (必須):
- Score Total: 0-100
- Category Scores:
	- Correctness: 0-30
	- Safety: 0-20
	- Readability/Maintainability: 0-20
	- Test Coverage: 0-20
	- UX/Design Consistency: 0-10
- Fail Reasons: 減点理由を箇条書き
- Improve Tasks: 閾値未満時に再委譲する修正タスク

## Execution Order (標準)

1. Scout-Agent
2. Spec-Agent
3. Risk-Agent
4. Page-Designer-Agent
5. Backend-Agent / Data-Agent (並列可)
6. Test-Agent
7. QA-Agent
8. Review-Agent
9. Release-Agent

## Quality Gates

- Gate 1: 要件の検証可能性 (Spec-Agent)
- Gate 2: High リスクの対策有無 (Risk-Agent)
- Gate 3: テスト結果の妥当性 (QA-Agent)
- Gate 4: レビュー指摘の解消 (Review-Agent)
- Gate 5: Review Score >= 85/100 (Review-Agent)

どれか1つでも未達なら、Release-Agent は完了宣言してはならない。

## Score-Based Improvement Loop

- Review Score が 85 未満の場合、Manager は完了報告を禁止する。
- Manager は Fail Reasons を修正タスクへ変換し、担当エージェントへ再委譲する。
- 再実装後は Test-Agent -> QA-Agent -> Review-Agent を再実行する。
- このループは最大 3 回まで実行し、3 回目でも 85 未満なら「未達理由」と「残課題」を明示して停止する。

## Output Style

- 重要事項から先に報告
- 変更していないものは「未変更」と明示
- 不確実な点は仮定として分離
- ファイル参照はパス付きで明示

## Quick Start Command (運用手順)

1. 依頼受領後、Manager は 10 サブエージェントのうち最低 3 名を即時起動して探索・要件化・リスク抽出を並列実行する。
2. 画面変更がある場合は Page-Designer-Agent を先行起動し、UI仕様を確定する。
3. 変更実装は Backend-Agent / Data-Agent に分配する。
4. 実装後は Test-Agent -> QA-Agent -> Review-Agent の順に必ず通す。
5. Review Score が 85 未満なら改善ループを回す。
6. 最後に Release-Agent がユーザー向け最終報告を作成する。

---

この CLAUDE.md が存在する限り、Manager は「自分で全部実装する」動きを取ってはならない。
