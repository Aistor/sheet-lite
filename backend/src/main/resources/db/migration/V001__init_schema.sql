-- Sheet Lite 初始数据库 schema（V001）
-- 目标：MySQL 8.0.x / InnoDB / utf8mb4。
-- 约定：
--   1. 所有时间列使用 DATETIME(3)，应用按 UTC 写入；不使用 TIMESTAMP，避免 2038 与时区隐式转换。
--   2. 主键由应用生成（MyBatis-Plus ASSIGN_ID / 雪花 ID），不使用 AUTO_INCREMENT。
--   3. 不建立数据库外键；引用完整性、级联清理和删除顺序由应用事务负责，避免批量写入与级联锁放大。
--   4. 行列坐标统一 0-based；数据库中的范围列统一为半开区间 [start, end)。
--   5. 空单元格不落库；只有 raw_input 非空、有公式或显式样式的单元格才写入 sl_cell。
--   6. 所有表和列均带中文 COMMENT，便于运维审阅；COMMENT 不参与业务逻辑。

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- 本文件仅作为历史初始结构参考；当前本地开发不使用 schema_version 或自动迁移执行器。

CREATE TABLE sl_workbook (
    id BIGINT NOT NULL COMMENT '工作簿主键，应用生成的雪花 ID',
    owner_id BIGINT NOT NULL COMMENT '所有者用户 ID',
    name VARCHAR(255) NOT NULL COMMENT '工作簿名称',
    description VARCHAR(1024) NULL COMMENT '工作簿描述',
    revision BIGINT NOT NULL DEFAULT 0 COMMENT '当前修订号，每次成功写操作递增',
    deleted TINYINT NOT NULL DEFAULT 0 COMMENT '软删除标记：0 正常，1 已删除',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间，UTC',
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '最后更新时间，UTC',
    PRIMARY KEY (id),
    KEY idx_workbook_owner_updated (owner_id, deleted, updated_at),
    CONSTRAINT chk_workbook_revision CHECK (revision >= 0),
    CONSTRAINT chk_workbook_deleted CHECK (deleted IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='工作簿元数据表';

CREATE TABLE sl_worksheet (
    id BIGINT NOT NULL COMMENT '工作表主键，应用生成的雪花 ID',
    workbook_id BIGINT NOT NULL COMMENT '所属工作簿 ID',
    name VARCHAR(255) COLLATE utf8mb4_0900_as_ci NOT NULL COMMENT '工作表名称，同一工作簿内唯一（大小写不敏感）',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '工作表显示顺序，越小越靠前',
    row_limit INT NOT NULL DEFAULT 1048576 COMMENT '行数上限，默认 1048576',
    column_limit INT NOT NULL DEFAULT 16384 COMMENT '列数上限，默认 16384',
    default_row_height DECIMAL(7, 2) NOT NULL DEFAULT 21.00 COMMENT '默认行高，单位磅',
    default_column_width DECIMAL(7, 2) NOT NULL DEFAULT 100.00 COMMENT '默认列宽，单位字符',
    freeze_row_count INT NOT NULL DEFAULT 0 COMMENT '冻结行数',
    freeze_column_count INT NOT NULL DEFAULT 0 COMMENT '冻结列数',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间，UTC',
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '最后更新时间，UTC',
    PRIMARY KEY (id),
    UNIQUE KEY uk_worksheet_workbook_name (workbook_id, name),
    KEY idx_worksheet_workbook_sort (workbook_id, sort_order),
    CONSTRAINT chk_worksheet_row_limit CHECK (row_limit BETWEEN 1 AND 1048576),
    CONSTRAINT chk_worksheet_column_limit CHECK (column_limit BETWEEN 1 AND 16384),
    CONSTRAINT chk_worksheet_freeze_rows CHECK (freeze_row_count >= 0 AND freeze_row_count <= row_limit),
    CONSTRAINT chk_worksheet_freeze_columns CHECK (freeze_column_count >= 0 AND freeze_column_count <= column_limit),
    CONSTRAINT chk_worksheet_default_height CHECK (default_row_height > 0 AND default_row_height <= 409.5),
    CONSTRAINT chk_worksheet_default_width CHECK (default_column_width > 0 AND default_column_width <= 255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='工作表元数据表';

CREATE TABLE sl_workbook_member (
    workbook_id BIGINT NOT NULL COMMENT '工作簿 ID',
    user_id BIGINT NOT NULL COMMENT '成员用户 ID',
    role VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '成员角色：OWNER、EDITOR 或 VIEWER',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间，UTC',
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '最后更新时间，UTC',
    PRIMARY KEY (workbook_id, user_id),
    KEY idx_member_user (user_id, workbook_id),
    CONSTRAINT chk_member_role CHECK (role IN ('OWNER', 'EDITOR', 'VIEWER'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='工作簿成员与角色表';

CREATE TABLE sl_style (
    id BIGINT NOT NULL COMMENT '样式主键，应用生成的雪花 ID',
    workbook_id BIGINT NOT NULL COMMENT '所属工作簿 ID，样式按工作簿隔离',
    style_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '样式 JSON 的 SHA-256，用于去重',
    style_version SMALLINT NOT NULL DEFAULT 1 COMMENT '样式结构版本号',
    style_json JSON NOT NULL COMMENT '样式属性 JSON',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间，UTC',
    PRIMARY KEY (id),
    UNIQUE KEY uk_style_workbook_hash (workbook_id, style_hash),
    CONSTRAINT chk_style_version CHECK (style_version >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='工作簿内去重后的单元格样式表';

CREATE TABLE sl_cell (
    worksheet_id BIGINT NOT NULL COMMENT '所属工作表 ID',
    row_index INT NOT NULL COMMENT '行号，0-based',
    column_index INT NOT NULL COMMENT '列号，0-based',
    raw_input MEDIUMTEXT NOT NULL COMMENT '用户输入的原始文本或公式',
    value_type VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '值类型：TEXT、NUMBER、BOOLEAN、DATE、ERROR、FORMULA',
    style_id BIGINT NULL COMMENT '引用 sl_style.id；无显式样式时为空',
    cached_value JSON NULL COMMENT '最近一次计算结果的 JSON 缓存',
    cache_version SMALLINT NOT NULL DEFAULT 1 COMMENT '缓存结构版本号',
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '最后更新时间，UTC',
    PRIMARY KEY (worksheet_id, row_index, column_index),
    CONSTRAINT chk_cell_row CHECK (row_index >= 0 AND row_index < 1048576),
    CONSTRAINT chk_cell_column CHECK (column_index >= 0 AND column_index < 16384),
    CONSTRAINT chk_cell_raw_input_len CHECK (CHAR_LENGTH(raw_input) <= 32767),
    CONSTRAINT chk_cell_cache_version CHECK (cache_version >= 1),
    CONSTRAINT chk_cell_value_type CHECK (value_type IN ('TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'ERROR', 'FORMULA'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='非空单元格稀疏存储表';

CREATE TABLE sl_row_dimension (
    worksheet_id BIGINT NOT NULL COMMENT '所属工作表 ID',
    row_index INT NOT NULL COMMENT '行号，0-based',
    height DECIMAL(7, 2) NOT NULL COMMENT '行高，单位磅',
    hidden TINYINT NOT NULL DEFAULT 0 COMMENT '是否隐藏：0 否，1 是',
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '最后更新时间，UTC',
    PRIMARY KEY (worksheet_id, row_index),
    CONSTRAINT chk_row_dimension_row CHECK (row_index >= 0 AND row_index < 1048576),
    CONSTRAINT chk_row_dimension_height CHECK (height > 0 AND height <= 409.5),
    CONSTRAINT chk_row_dimension_hidden CHECK (hidden IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='行高与隐藏状态表';

CREATE TABLE sl_column_dimension (
    worksheet_id BIGINT NOT NULL COMMENT '所属工作表 ID',
    column_index INT NOT NULL COMMENT '列号，0-based',
    width DECIMAL(7, 2) NOT NULL COMMENT '列宽，单位字符',
    hidden TINYINT NOT NULL DEFAULT 0 COMMENT '是否隐藏：0 否，1 是',
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '最后更新时间，UTC',
    PRIMARY KEY (worksheet_id, column_index),
    CONSTRAINT chk_column_dimension_column CHECK (column_index >= 0 AND column_index < 16384),
    CONSTRAINT chk_column_dimension_width CHECK (width > 0 AND width <= 255),
    CONSTRAINT chk_column_dimension_hidden CHECK (hidden IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='列宽与隐藏状态表';

CREATE TABLE sl_merged_range (
    id BIGINT NOT NULL COMMENT '合并区域主键，应用生成的雪花 ID',
    worksheet_id BIGINT NOT NULL COMMENT '所属工作表 ID',
    start_row INT NOT NULL COMMENT '起始行号，0-based，包含',
    start_column INT NOT NULL COMMENT '起始列号，0-based，包含',
    end_row INT NOT NULL COMMENT '结束行号，0-based，不包含',
    end_column INT NOT NULL COMMENT '结束列号，0-based，不包含',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间，UTC',
    PRIMARY KEY (id),
    UNIQUE KEY uk_merged_anchor (worksheet_id, start_row, start_column),
    KEY idx_merged_worksheet_row (worksheet_id, start_row, end_row),
    CONSTRAINT chk_merged_range CHECK (
        start_row >= 0
        AND start_column >= 0
        AND end_row > start_row
        AND end_column > start_column
        AND end_row <= 1048576
        AND end_column <= 16384
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='合并单元格区域表';

CREATE TABLE sl_operation_log (
    id BIGINT NOT NULL COMMENT '操作日志主键，应用生成的雪花 ID',
    workbook_id BIGINT NOT NULL COMMENT '工作簿 ID',
    worksheet_id BIGINT NULL COMMENT '相关工作表 ID；工作簿级操作为空',
    operation_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '客户端操作幂等 ID',
    base_revision BIGINT NOT NULL COMMENT '操作前的工作簿修订号',
    revision BIGINT NOT NULL COMMENT '操作后的工作簿修订号，必须等于 base_revision + 1',
    operation_type VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '操作类型标识',
    payload JSON NOT NULL COMMENT '操作参数 JSON',
    actor_id BIGINT NULL COMMENT '操作者用户 ID；系统操作为空',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间，UTC',
    PRIMARY KEY (id),
    UNIQUE KEY uk_operation_workbook_op (workbook_id, operation_id),
    UNIQUE KEY uk_operation_workbook_revision (workbook_id, revision),
    KEY idx_operation_workbook_created (workbook_id, created_at),
    KEY idx_operation_created (created_at),
    CONSTRAINT chk_operation_base_revision CHECK (base_revision >= 0),
    CONSTRAINT chk_operation_revision CHECK (revision = base_revision + 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='工作簿写操作日志与幂等/版本控制表';

CREATE TABLE sl_snapshot (
    id BIGINT NOT NULL COMMENT '快照主键，应用生成的雪花 ID',
    workbook_id BIGINT NOT NULL COMMENT '工作簿 ID',
    revision BIGINT NOT NULL COMMENT '快照对应的工作簿修订号',
    storage_type VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'INLINE' COMMENT '存储类型：INLINE 内联或 OBJECT 对象存储',
    storage_key VARCHAR(512) NULL COMMENT '对象存储键；INLINE 类型时为空',
    payload LONGTEXT NULL COMMENT '内联快照内容；OBJECT 类型时为空',
    payload_bytes BIGINT NULL COMMENT '快照内容字节数',
    checksum CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '快照内容 SHA-256 校验和',
    created_by BIGINT NULL COMMENT '创建者用户 ID；系统创建为空',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间，UTC',
    PRIMARY KEY (id),
    UNIQUE KEY uk_snapshot_workbook_revision (workbook_id, revision),
    KEY idx_snapshot_created (created_at),
    CONSTRAINT chk_snapshot_revision CHECK (revision >= 0),
    CONSTRAINT chk_snapshot_storage_type CHECK (storage_type IN ('INLINE', 'OBJECT')),
    CONSTRAINT chk_snapshot_payload CHECK (
        (
            storage_type = 'INLINE'
            AND payload IS NOT NULL
            AND storage_key IS NULL
        )
        OR
        (
            storage_type = 'OBJECT'
            AND storage_key IS NOT NULL
            AND payload IS NULL
        )
    ),
    CONSTRAINT chk_snapshot_bytes CHECK (payload_bytes IS NULL OR payload_bytes >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='工作簿版本快照表';

CREATE TABLE sl_task (
    id BIGINT NOT NULL COMMENT '任务主键，应用生成的雪花 ID',
    workbook_id BIGINT NOT NULL COMMENT '所属工作簿 ID',
    task_type VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '任务类型标识',
    status VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'PENDING' COMMENT '任务状态：PENDING、RUNNING、SUCCEEDED、FAILED、CANCELLED',
    progress SMALLINT NOT NULL DEFAULT 0 COMMENT '进度百分比，0-100',
    payload JSON NULL COMMENT '任务输入 JSON',
    result JSON NULL COMMENT '任务结果 JSON',
    error_code VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL COMMENT '错误码',
    error_message VARCHAR(1024) NULL COMMENT '错误信息',
    created_by BIGINT NULL COMMENT '创建者用户 ID；系统创建为空',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间，UTC',
    started_at DATETIME(3) NULL COMMENT '开始执行时间，UTC',
    finished_at DATETIME(3) NULL COMMENT '结束时间，UTC',
    expires_at DATETIME(3) NULL COMMENT '过期时间，UTC',
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '最后更新时间，UTC',
    PRIMARY KEY (id),
    KEY idx_task_workbook_created (workbook_id, created_at),
    KEY idx_task_status_created (status, created_at),
    KEY idx_task_expires (expires_at),
    CONSTRAINT chk_task_status CHECK (status IN ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED')),
    CONSTRAINT chk_task_progress CHECK (progress BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='异步任务状态表';
