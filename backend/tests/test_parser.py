from backend.app.services.email_parser import parse_raw_email

def test_parse_raw_email():
    sample = """Received: from [185.220.101.5] by mx.corp.com;
From: "Test Sender" <sender@example.com>
Subject: Test Subject
Reply-To: <reply@other.com>
Content-Type: text/plain

Hello world this is a test body with a link https://example.com/test
"""
    res = parse_raw_email(sample)
    assert res["sender"] == "sender@example.com"
    assert res["sender_domain"] == "example.com"
    assert res["display_name"] == "Test Sender"
    assert res["reply_to"] == "reply@other.com"
    assert "https://example.com/test" in res["urls"]
    assert len(res["raw_hash"]) == 64
    assert len(res["received_headers"]) == 1

