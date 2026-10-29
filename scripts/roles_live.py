import json, urllib.request, sys
B="https://upgfyvdnuniccgkwyacd.supabase.co"; K="sb_publishable_ByGZqRZFF4yNLl5V3HHeQQ_1bxrZBOs"
def req(method, path, tok=None, body=None, prefer="return=representation"):
    h={"apikey":K,"Content-Type":"application/json","Prefer":prefer}
    if tok: h["Authorization"]="Bearer "+tok
    r=urllib.request.Request(B+path, data=json.dumps(body).encode() if body is not None else None, headers=h, method=method)
    try:
        with urllib.request.urlopen(r) as x: t=x.read().decode(); return x.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e: return e.code, e.read().decode()[:200]
def login(u,p): return req("POST","/auth/v1/token?grant_type=password",body={"email":u+"@staff.invalid","password":p})[1]["access_token"]
S=login("scholar",__import__("os").environ["AWDA_SCHOLAR_PW"]); A=login("samer",__import__("os").environ["AWDA_SAMER_PW"]); H=login("hadi",__import__("os").environ["AWDA_HADI_PW"])
ok=0; bad=[]
def check(name, cond):
    global ok
    if cond: ok+=1
    else: bad.append(name)
    print(("PASS " if cond else "FAIL ")+name)
rpc=lambda f,tok,b: req("POST","/rest/v1/rpc/"+f,tok,b)
# roles
check("scholar roles = writer", rpc("my_roles",S,{})[1]==["writer"])
check("samer roles = admin", rpc("my_roles",A,{})[1]==["admin"])
check("hadi roles = owner", rpc("my_roles",H,{})[1]==["owner"])
# scholar tries to publish a page directly
st,p=req("POST","/rest/v1/page",S,{"section":"prayer","title":"اختبار صفحة","blocks":[{"t":"p","v":"نص"}],"status":"published"})
check("scholar page lands as draft, not published", st==201 and p[0]["status"]=="draft"); pid=p[0]["id"]
st,p=req("PATCH",f"/rest/v1/page?id=eq.{pid}",S,{"status":"published"})
check("scholar cannot flip own page to published", st==200 and p[0]["status"]=="draft")
st,p=req("PATCH",f"/rest/v1/page?id=eq.{pid}",S,{"status":"pending"})
check("scholar sends page for approval", p[0]["status"]=="pending")
st,_=rpc("ui_set_text",S,{"p_key":"ui.home.test1","p_value":"x"})
check("scholar cannot rewrite a line", st>=400)
st,p=req("GET","/rest/v1/page?status=eq.pending&select=id",None)
check("public never sees a pending page", p==[])
# admin approves the page
st,p=req("PATCH",f"/rest/v1/page?id=eq.{pid}",A,{"status":"published"})
check("admin publishes page", p[0]["status"]=="published")
st,p=req("GET",f"/rest/v1/page?id=eq.{pid}&select=id",None)
check("public now sees it", len(p)==1)
# scholar edits a published page -> proposal
st,p=req("PATCH",f"/rest/v1/page?id=eq.{pid}",S,{"title":"عنوان آخر"})
check("scholar cannot edit a published page directly", p==[] or p[0]["title"]!="عنوان آخر")
st,p=req("POST","/rest/v1/page_proposal",S,{"page_id":pid,"title":"عنوان مقترح","blocks":[{"t":"p","v":"نص جديد"}],"note":"تصحيح"})
check("scholar proposes an edit", st==201 and p[0]["status"]=="pending"); prid=p[0]["id"]
st,p=req("PATCH",f"/rest/v1/page_proposal?id=eq.{prid}",S,{"status":"approved"})
check("scholar cannot approve own proposal", p[0]["status"]=="pending")
st,_=rpc("approve_page_proposal",S,{"p_id":prid})
check("scholar cannot call approve", st>=400)
st,_=rpc("approve_page_proposal",A,{"p_id":prid})
st,p=req("GET",f"/rest/v1/page?id=eq.{pid}&select=title,status",None)
check("admin approval applies the proposal live", p[0]["title"]=="عنوان مقترح" and p[0]["status"]=="published")
st,p=req("GET",f"/rest/v1/page_revision?page_id=eq.{pid}&select=id",A)
check("history kept", len(p)>=2)
# requests: two-step
st,p=req("POST","/rest/v1/work_request",S,{"kind":"media","title":"فيديو عن الاحتضار","body":"نص طويل من الشيخ…","status":"done"})
check("scholar request starts as new", st==201 and p[0]["status"]=="new"); rid=p[0]["id"]
st,_=rpc("request_decide",S,{"p_id":rid,"p_approve":True})
check("scholar cannot approve own request", st>=400)
st,_=rpc("request_decide",A,{"p_id":rid,"p_approve":False})
check("decline needs a reason", st>=400)
st,_=rpc("request_decide",H,{"p_id":rid,"p_approve":True,"p_note":"موافق"})
check("owner approves request (step 1)", st in (200,204))
rpc("request_start",A,{"p_id":rid})
# claude builds a draft page for it
st,p=req("POST","/rest/v1/page",A,{"section":"death","title":"صفحة مبنية","blocks":[{"t":"p","v":"…"}],"status":"draft"}); bid=p[0]["id"]
st,_=rpc("request_deliver",A,{"p_id":rid,"p_note":"جاهزة للمراجعة","p_page":bid})
st,p=req("GET",f"/rest/v1/work_request?id=eq.{rid}&select=status",S)
check("delivered -> waiting for scholar sign-off", p[0]["status"]=="review")
st,p=req("GET",f"/rest/v1/page?id=eq.{bid}&select=id",None)
check("built page not public before sign-off", p==[])
st,_=rpc("request_signoff",S,{"p_id":rid,"p_ok":False})
check("asking for changes needs a note", st>=400)
st,_=rpc("request_signoff",S,{"p_id":rid,"p_ok":True,"p_note":"جزاكم الله خيراً"})
st,p=req("GET",f"/rest/v1/work_request?id=eq.{rid}&select=status",S)
check("scholar signs off (step 2) -> done", p[0]["status"]=="done")
st,p=req("GET",f"/rest/v1/page?id=eq.{bid}&select=status",None)
check("sign-off publishes the built page", len(p)==1 and p[0]["status"]=="published")
st,p=req("POST","/rest/v1/work_request",A,{"kind":"other","title":"طلب من المدير"})
check("admin request skips step 1", p[0]["status"]=="approved"); arid=p[0]["id"]
st,p=rpc("staff_inbox",A,{}); check("admin inbox works", isinstance(p,dict) and "total" in p)
st,p=rpc("staff_inbox",S,{}); check("scholar inbox works", isinstance(p,dict) and "signoff" in p)
st,_=req("POST","/rest/v1/work_request",None,{"title":"anon"})
check("anonymous cannot file a request", st>=400)
st,p=req("GET","/rest/v1/annotation?select=id",None)
check("anonymous sees no notes", st>=400 or p==[])
# clean up test rows
for path in [f"/rest/v1/work_request?id=in.({rid},{arid})", f"/rest/v1/page?id=in.({pid},{bid})"]:
    st,_=req("DELETE",path,A,prefer="return=minimal")
print(f"\n{ok} passed, {len(bad)} failed", bad)
