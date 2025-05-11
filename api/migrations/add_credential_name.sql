-- 添加凭证名称字段
ALTER TABLE webauthn_credentials ADD COLUMN name TEXT;

-- 更新现有凭证，设置默认名称
UPDATE webauthn_credentials SET name = 'Credential ' || substr(id, 1, 8);
