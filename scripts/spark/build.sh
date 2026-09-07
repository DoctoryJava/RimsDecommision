#!/usr/bin/env bash
#
# 构建 scripts/spark/rims-spark-query.jar（包含 com.rims.spark.QueryJob）。
#
# 打包策略：
#   1. 优先使用 Maven（pom.xml）：mvn package 后把 target/rims-spark-query.jar 拷贝到本目录；
#   2. 未安装 Maven 时回退到 javac + jar 手动打包（编译期 classpath 取自 $SPARK_HOME/jars/*）。
#
# 产物： scripts/spark/rims-spark-query.jar
#        （与后端 application.yml 的 app.spark.query-job-jar / SPARK_QUERY_JOB_JAR 对应）
#
# 用法： bash build.sh    或    ./build.sh
set -euo pipefail

# 切到本脚本所在目录（scripts/spark），保证相对路径稳定
cd "$(dirname "$0")"

OUT_JAR="rims-spark-query.jar"
MAIN_CLASS="com.rims.spark.QueryJob"

echo "[build.sh] 构建目录: $(pwd)"
echo "[build.sh] 目标产物: ${OUT_JAR}"

# ---------- 方式一：Maven ----------
if command -v mvn >/dev/null 2>&1; then
  echo "[build.sh] 检测到 Maven，使用 mvn package 打包..."
  mvn -q -DskipTests package
  cp -f "target/${OUT_JAR}" "${OUT_JAR}"
  echo "[build.sh] 完成: $(pwd)/${OUT_JAR}"
  exit 0
fi

# ---------- 方式二：javac + jar ----------
echo "[build.sh] 未检测到 Maven，回退到 javac + jar 手动打包..."

if [ -z "${SPARK_HOME:-}" ]; then
  echo "[build.sh] 错误: 未设置 SPARK_HOME，且未安装 Maven，无法获取 Spark 编译依赖。" >&2
  echo "[build.sh] 请安装 Maven，或设置 SPARK_HOME 指向 Spark 3.3.x 安装目录后重试。" >&2
  exit 1
fi

SPARK_JARS="${SPARK_HOME}/jars"
if [ ! -d "${SPARK_JARS}" ]; then
  echo "[build.sh] 错误: 找不到 Spark jars 目录: ${SPARK_JARS}" >&2
  exit 1
fi

BUILD_DIR="build/classes"
rm -rf build
mkdir -p "${BUILD_DIR}"

echo "[build.sh] javac -cp ${SPARK_JARS}/* ..."
javac -cp "${SPARK_JARS}/*" \
      -d "${BUILD_DIR}" \
      src/com/rims/spark/QueryJob.java

# 仅把编译产物打入 jar；Main-Class 非必需（运行时由 spark-submit --class 指定）
echo "[build.sh] jar ..."
jar cf "${OUT_JAR}" -C "${BUILD_DIR}" .

rm -rf build
echo "[build.sh] 完成: $(pwd)/${OUT_JAR}"
