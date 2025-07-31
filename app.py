from flask import Flask, request, jsonify
import requests
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # 解决跨域问题

# 飞书表单提交URL，需要替换为实际表单的提交地址
FEISHU_FORM_URL = 'https://kihjouvpr9a.feishu.cn/share/base/form/shrcns1kv4OBh2gKGqjAyD4qWAd'

@app.route('/submit-form', methods=['POST'])
def submit_form():
    try:
        # 获取前端提交的表单数据
        form_data = request.form.to_dict()
        print('收到表单数据:', form_data)

        # 这里需要根据飞书表单的实际字段结构转换数据
        # 飞书表单可能需要特定的字段名和格式
        feishu_data = {
            'name': form_data.get('name', ''),
            'email': form_data.get('email', ''),
            'subject': form_data.get('subject', ''),
            'message': form_data.get('message', '')
        }

        # 提交数据到飞书表单（需要根据飞书API调整）
        # 注意：飞书表单可能需要特定的请求格式和认证
        response = requests.post(FEISHU_FORM_URL, data=feishu_data)
        response.raise_for_status()

        return jsonify({'status': 'success', 'message': '表单提交成功'}), 200
    except Exception as e:
        print('表单提交失败:', str(e))
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)